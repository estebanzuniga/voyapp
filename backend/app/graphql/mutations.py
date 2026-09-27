import random
from datetime import date, datetime, time, timezone

import strawberry
from graphql import GraphQLError
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import selectinload

from app.auth.security import create_access_token, hash_password, verify_password
from app.config import settings
from app.email import send_password_reset_email
from app.graphql.access import require_trip_access, require_trip_owner
from app.graphql.types.auth import AuthPayload
from app.graphql.types.city import City
from app.graphql.types.day import Day
from app.graphql.types.permission import PermissionLevel
from app.graphql.types.share import Collaborator, ShareLink
from app.graphql.types.stop import LocationInput, Stop
from app.graphql.types.trip import Trip
from app.graphql.types.user import User
from app.models.city import City as CityModel
from app.models.day import Day as DayModel
from app.models.password_reset_token import PasswordResetToken as PasswordResetTokenModel
from app.models.stop import Stop as StopModel
from app.models.trip import Trip as TripModel
from app.models.trip_collaborator import MAX_COLLABORATORS_PER_TRIP
from app.models.trip_collaborator import TripCollaborator as TripCollaboratorModel
from app.models.trip_share_link import TripShareLink as TripShareLinkModel
from app.models.user import AVATAR_COLORS, LANGUAGE_OPTIONS, normalize_email
from app.models.user import User as UserModel


async def _get_owned_share_link(session, trip_id: int, link_id: int) -> TripShareLinkModel | None:
    return await session.scalar(
        select(TripShareLinkModel).where(
            TripShareLinkModel.id == link_id,
            TripShareLinkModel.trip_id == trip_id,
        )
    )


async def _resolve_stop_parent(
    session, day_id: int | None, city_id: int | None
) -> tuple[DayModel | None, CityModel | None]:
    """Fetch and validate a stop's intended parent for add/reorder/move -
    exactly one of a day or a city, mirroring the CHECK constraint on the
    stops table itself (a stop is either a scheduled part of one day, or an
    undated recommendation in one city's list, never both/neither)."""
    if (day_id is None) == (city_id is None):
        raise Exception("A stop must belong to exactly one of a day or a city")

    if day_id is not None:
        day = await session.get(DayModel, day_id)
        if day is None:
            raise Exception("Day not found")
        return day, None

    city = await session.get(CityModel, city_id)
    if city is None:
        raise Exception("City not found")
    return None, city


async def _stop_parent_trip_id(session, stop: StopModel) -> int:
    """The trip id owning whichever parent (day or city) `stop` currently
    belongs to - for mutations that only have the stop itself to start from
    (update/duplicate/delete), not a fresh day_id/city_id argument."""
    if stop.day_id is not None:
        day = await session.get(DayModel, stop.day_id)
        if day is None:
            raise Exception("Stop not found")
        return day.trip_id
    if stop.city_id is not None:
        city = await session.get(CityModel, stop.city_id)
        if city is None:
            raise Exception("Stop not found")
        return city.trip_id
    raise Exception("Stop not found")


def _stop_parent_filter(day_id: int | None, city_id: int | None):
    """The `WHERE` clause matching every stop sharing the same parent (the
    "sibling list" order_index is scoped within) as a stop with this
    day_id/city_id - exactly one of which is always set."""
    return StopModel.day_id == day_id if day_id is not None else StopModel.city_id == city_id


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def signup(
        self,
        info: strawberry.Info,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
    ) -> AuthPayload:
        first_name = first_name.strip()
        last_name = last_name.strip()
        if not first_name or not last_name:
            raise Exception("First name and last name are required")

        if len(password) < 8:
            raise Exception("Password must be at least 8 characters")

        email = normalize_email(email)

        session = info.context.session
        existing = await session.execute(
            select(UserModel).where(func.lower(UserModel.email) == email)
        )
        if existing.scalar_one_or_none() is not None:
            raise Exception("A user with that email already exists")

        user = UserModel(
            email=email,
            password_hash=hash_password(password),
            first_name=first_name,
            last_name=last_name,
            # Picked once at signup so there's always something to render
            # (initials + a color) before the user ever visits their
            # profile - `update_avatar_color` is how they change it later.
            avatar_color=random.choice(AVATAR_COLORS),
        )
        session.add(user)
        await session.commit()

        token = create_access_token(user.id)
        return AuthPayload(token=token, user=User.from_model(user))

    @strawberry.mutation
    async def login(self, info: strawberry.Info, email: str, password: str) -> AuthPayload:
        session = info.context.session
        result = await session.execute(
            select(UserModel).where(func.lower(UserModel.email) == normalize_email(email))
        )
        user = result.scalar_one_or_none()
        if user is None or not verify_password(password, user.password_hash):
            raise Exception("Invalid email or password")

        token = create_access_token(user.id)
        return AuthPayload(token=token, user=User.from_model(user))

    @strawberry.mutation
    async def create_trip(
        self, info: strawberry.Info, title: str, start_date: date, end_date: date
    ) -> Trip:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        trip = TripModel(title=title, start_date=start_date, end_date=end_date, user_id=user.id)
        session.add(trip)
        await session.commit()
        return Trip.from_model(trip)

    @strawberry.mutation
    async def update_trip(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
        title: str,
        start_date: date,
        end_date: date,
    ) -> Trip:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        title = title.strip()
        if not title:
            # Plain-English `message` is a fallback for any GraphQL client
            # that doesn't look at `extensions` - the frontend's own error
            # UI keys off `extensions.code` instead so it can show this in
            # the signed-in user's chosen language rather than always
            # English (see TRIP_SHRINK_BLOCKED below for the same pattern).
            raise GraphQLError("Trip title is required", extensions={"code": "TRIP_TITLE_REQUIRED"})
        if start_date > end_date:
            raise GraphQLError(
                "Start date must be before end date", extensions={"code": "TRIP_INVALID_DATE_RANGE"}
            )

        session = info.context.session
        # Editor-level, same as add_day/delete_day - reshaping the date
        # range is really just a bulk version of adding/removing days, not
        # an ownership-only action like managing sharing.
        trip = await require_trip_access(session, int(id), user, editor=True)

        # Shrinking the range can push existing days outside it. That's
        # fine for a day nobody's touched yet (no stops - "not started"),
        # but silently deleting a day someone already planned stops for
        # would be a surprising way to lose data, so block the whole
        # update instead and let the frontend explain why.
        result = await session.execute(
            select(DayModel)
            .options(selectinload(DayModel.stops))
            .where(
                DayModel.trip_id == trip.id,
                or_(DayModel.date < start_date, DayModel.date > end_date),
            )
        )
        excluded_days = result.scalars().all()
        started_days = [day for day in excluded_days if day.stops]
        if started_days:
            blocking_dates = sorted(day.date.isoformat() for day in started_days)
            noun = "day" if len(started_days) == 1 else "days"
            raise GraphQLError(
                f"Can't shrink the trip to these dates - {noun} {', '.join(blocking_dates)} already "
                "have stops planned. Remove their stops first, or keep dates that include them.",
                # `dates` (raw ISO strings, not locale-formatted - that's the
                # frontend's job with the viewer's own `locale`) is what the
                # translated UI message is actually built from.
                extensions={"code": "TRIP_SHRINK_BLOCKED", "dates": blocking_dates},
            )

        for day in excluded_days:
            await session.delete(day)

        trip.title = title
        trip.start_date = start_date
        trip.end_date = end_date
        await session.commit()
        return Trip.from_model(trip)

    @strawberry.mutation
    async def delete_trip(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        trip = await session.get(TripModel, int(id))
        if trip is None:
            return False

        # Owner-only, same reasoning as require_trip_owner's other call
        # sites: deleting the whole trip out from under collaborators is a
        # bigger deal than an editor being able to add/remove days.
        if trip.user_id != user.id:
            raise Exception("Trip not found")

        # No DB-level ON DELETE CASCADE and no ORM cascade configured on
        # these relationships (deliberately - deleteDay/deleteStop delete
        # one row at a time and never needed it), so a plain
        # session.delete(trip) would just hit a FK violation. Clear out
        # every dependent table explicitly, deepest first.
        day_ids = select(DayModel.id).where(DayModel.trip_id == trip.id)
        city_ids = select(CityModel.id).where(CityModel.trip_id == trip.id)
        await session.execute(delete(StopModel).where(StopModel.day_id.in_(day_ids)))
        # A stop is never linked to both, so this and the delete above are
        # disjoint - together they cover every stop that could reference
        # this trip's days/cities before those rows themselves go away.
        await session.execute(delete(StopModel).where(StopModel.city_id.in_(city_ids)))
        await session.execute(delete(DayModel).where(DayModel.trip_id == trip.id))
        await session.execute(delete(CityModel).where(CityModel.trip_id == trip.id))
        await session.execute(delete(TripShareLinkModel).where(TripShareLinkModel.trip_id == trip.id))
        await session.execute(delete(TripCollaboratorModel).where(TripCollaboratorModel.trip_id == trip.id))
        await session.delete(trip)
        await session.commit()
        return True

    @strawberry.mutation
    async def add_day(self, info: strawberry.Info, trip_id: strawberry.ID, date: date) -> Day:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        trip = await require_trip_access(session, int(trip_id), user, editor=True)

        existing = await session.scalar(
            select(DayModel).where(DayModel.trip_id == trip.id, DayModel.date == date)
        )
        if existing is not None:
            raise Exception("This trip already has a day for that date")

        day = DayModel(trip_id=trip.id, date=date)
        session.add(day)
        await session.commit()
        return Day.from_model(day)

    @strawberry.mutation
    async def delete_day(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        day = await session.get(DayModel, int(id))
        if day is None:
            return False

        await require_trip_access(
            session, day.trip_id, user, editor=True, not_found_message="Day not found"
        )

        await session.delete(day)
        await session.commit()
        return True

    # --- Cities --------------------------------------------------------
    # A City is a trip-scoped grouping (see models/city.py) with two jobs:
    # `Day.city_id` groups consecutive days for the day-list "collapse by
    # city" view, and `City.stops` holds undated recommendations for the
    # "Stops per city" section - those use the same add/update/move/
    # duplicate/delete/reorder stop mutations below as day-stops, just
    # parented to a city (`cityId`) instead of a day (`dayId`).

    @strawberry.mutation
    async def create_city(self, info: strawberry.Info, trip_id: strawberry.ID, name: str) -> City:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        name = name.strip()
        if not name:
            raise Exception("City name is required")

        session = info.context.session
        trip = await require_trip_access(session, int(trip_id), user, editor=True)

        city = CityModel(trip_id=trip.id, name=name)
        session.add(city)
        await session.commit()
        return City.from_model(city)

    @strawberry.mutation
    async def rename_city(self, info: strawberry.Info, id: strawberry.ID, name: str) -> City:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        name = name.strip()
        if not name:
            raise Exception("City name is required")

        session = info.context.session
        city = await session.get(CityModel, int(id))
        if city is None:
            raise Exception("City not found")

        await require_trip_access(
            session, city.trip_id, user, editor=True, not_found_message="City not found"
        )

        city.name = name
        await session.commit()
        return City.from_model(city)

    @strawberry.mutation
    async def delete_city(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        city = await session.get(CityModel, int(id))
        if city is None:
            return False

        await require_trip_access(
            session, city.trip_id, user, editor=True, not_found_message="City not found"
        )

        # Same "don't silently destroy content" reasoning as updateTrip's
        # shrink-blocking (TRIP_SHRINK_BLOCKED below): deleting a city that
        # still groups days or holds recommendations would either orphan a
        # dangling reference or silently wipe that content. Ungroup the
        # days / remove the stops first, then delete.
        day_count = await session.scalar(
            select(func.count()).select_from(DayModel).where(DayModel.city_id == city.id)
        )
        stop_count = await session.scalar(
            select(func.count()).select_from(StopModel).where(StopModel.city_id == city.id)
        )
        if day_count > 0 or stop_count > 0:
            raise Exception(
                "This city still has days or stops assigned to it - move or remove them first"
            )

        await session.delete(city)
        await session.commit()
        return True

    @strawberry.mutation
    async def set_day_city(
        self, info: strawberry.Info, day_id: strawberry.ID, city_id: strawberry.ID | None
    ) -> Day:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        day = await session.get(DayModel, int(day_id))
        if day is None:
            raise Exception("Day not found")

        await require_trip_access(
            session, day.trip_id, user, editor=True, not_found_message="Day not found"
        )

        if city_id is not None:
            city = await session.get(CityModel, int(city_id))
            # Not just "does this city exist" - it has to belong to the same
            # trip as the day, or this would silently link two unrelated
            # trips' data together.
            if city is None or city.trip_id != day.trip_id:
                raise Exception("City not found")
            day.city_id = city.id
        else:
            day.city_id = None

        await session.commit()
        return Day.from_model(day)

    @strawberry.mutation
    async def add_stop(
        self,
        info: strawberry.Info,
        name: str,
        location: LocationInput,
        day_id: strawberry.ID | None = None,
        city_id: strawberry.ID | None = None,
        notes: str | None = None,
        start_time: time | None = None,
        is_important: bool = False,
        is_optional: bool = False,
    ) -> Stop:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        if city_id is not None and start_time is not None:
            raise Exception("A city recommendation can't have a start time")

        session = info.context.session
        day, city = await _resolve_stop_parent(
            session,
            int(day_id) if day_id is not None else None,
            int(city_id) if city_id is not None else None,
        )
        trip_id = day.trip_id if day is not None else city.trip_id
        await require_trip_access(
            session,
            trip_id,
            user,
            editor=True,
            not_found_message="Day not found" if day is not None else "City not found",
        )

        parent_filter = _stop_parent_filter(
            day.id if day is not None else None, city.id if city is not None else None
        )
        next_index = await session.scalar(
            select(func.coalesce(func.max(StopModel.order_index), -1)).where(parent_filter)
        )
        stop = StopModel(
            day_id=day.id if day is not None else None,
            city_id=city.id if city is not None else None,
            name=name,
            lat=location.lat,
            lng=location.lng,
            order_index=next_index + 1,
            notes=notes,
            start_time=start_time,
            is_important=is_important,
            is_optional=is_optional,
        )
        session.add(stop)
        await session.commit()
        return Stop.from_model(stop)

    @strawberry.mutation
    async def reorder_stops(
        self,
        info: strawberry.Info,
        stop_ids: list[strawberry.ID],
        day_id: strawberry.ID | None = None,
        city_id: strawberry.ID | None = None,
    ) -> list[Stop]:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        day, city = await _resolve_stop_parent(
            session,
            int(day_id) if day_id is not None else None,
            int(city_id) if city_id is not None else None,
        )
        trip_id = day.trip_id if day is not None else city.trip_id
        await require_trip_access(
            session,
            trip_id,
            user,
            editor=True,
            not_found_message="Day not found" if day is not None else "City not found",
        )

        parent_filter = _stop_parent_filter(
            day.id if day is not None else None, city.id if city is not None else None
        )
        result = await session.execute(select(StopModel).where(parent_filter))
        stops_by_id = {stop.id: stop for stop in result.scalars().all()}

        if set(stops_by_id) != {int(stop_id) for stop_id in stop_ids}:
            raise Exception("stopIds must match the current stops exactly")

        for index, stop_id in enumerate(stop_ids):
            stops_by_id[int(stop_id)].order_index = index
        await session.commit()

        return [Stop.from_model(stops_by_id[int(stop_id)]) for stop_id in stop_ids]

    @strawberry.mutation
    async def move_stop(
        self,
        info: strawberry.Info,
        stop_id: strawberry.ID,
        to_index: int,
        to_day_id: strawberry.ID | None = None,
        to_city_id: strawberry.ID | None = None,
    ) -> Stop:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        stop = await session.get(StopModel, int(stop_id))
        if stop is None:
            raise Exception("Stop not found")

        source_trip_id = await _stop_parent_trip_id(session, stop)
        await require_trip_access(
            session, source_trip_id, user, editor=True, not_found_message="Stop not found"
        )

        target_day, target_city = await _resolve_stop_parent(
            session,
            int(to_day_id) if to_day_id is not None else None,
            int(to_city_id) if to_city_id is not None else None,
        )
        target_trip_id = target_day.trip_id if target_day is not None else target_city.trip_id
        await require_trip_access(
            session,
            target_trip_id,
            user,
            editor=True,
            not_found_message="Day not found" if target_day is not None else "City not found",
        )

        source_day_id = stop.day_id
        source_city_id = stop.city_id
        moving_to_same_parent = (
            target_day is not None and target_day.id == source_day_id
        ) or (target_city is not None and target_city.id == source_city_id)

        if not moving_to_same_parent:
            remaining_result = await session.execute(
                select(StopModel)
                .where(_stop_parent_filter(source_day_id, source_city_id), StopModel.id != stop.id)
                .order_by(StopModel.order_index)
            )
            for index, remaining_stop in enumerate(remaining_result.scalars().all()):
                remaining_stop.order_index = index

        target_parent_filter = _stop_parent_filter(
            target_day.id if target_day is not None else None,
            target_city.id if target_city is not None else None,
        )
        target_stops_result = await session.execute(
            select(StopModel)
            .where(target_parent_filter, StopModel.id != stop.id)
            .order_by(StopModel.order_index)
        )
        target_stops = list(target_stops_result.scalars().all())
        to_index = max(0, min(to_index, len(target_stops)))
        target_stops.insert(to_index, stop)

        stop.day_id = target_day.id if target_day is not None else None
        stop.city_id = target_city.id if target_city is not None else None
        # A start time stops meaning anything once a stop becomes an undated
        # city recommendation - clear it rather than block the move, since
        # (unlike, say, deleting a whole day's worth of stops) losing just
        # this one field is inconsequential and easy to re-add if the stop
        # later gets scheduled again.
        if target_city is not None:
            stop.start_time = None
        for index, target_stop in enumerate(target_stops):
            target_stop.order_index = index

        await session.commit()
        return Stop.from_model(stop)

    @strawberry.mutation
    async def update_stop(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
        name: str,
        location: LocationInput,
        notes: str | None = None,
        start_time: time | None = None,
        is_important: bool = False,
        is_optional: bool = False,
    ) -> Stop:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        stop = await session.get(StopModel, int(id))
        if stop is None:
            raise Exception("Stop not found")

        trip_id = await _stop_parent_trip_id(session, stop)
        await require_trip_access(
            session, trip_id, user, editor=True, not_found_message="Stop not found"
        )

        if stop.city_id is not None and start_time is not None:
            raise Exception("A city recommendation can't have a start time")

        stop.name = name
        stop.lat = location.lat
        stop.lng = location.lng
        # Like name/location, these are a full replace rather than a partial
        # patch - the edit form always sends its current field values
        # (including `None`/`False` for a field the user cleared), so
        # there's no "unset" case to distinguish from "leave unchanged" here.
        stop.notes = notes
        stop.start_time = start_time
        stop.is_important = is_important
        stop.is_optional = is_optional
        await session.commit()
        return Stop.from_model(stop)

    @strawberry.mutation
    async def duplicate_stop(self, info: strawberry.Info, id: strawberry.ID) -> Stop:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        stop = await session.get(StopModel, int(id))
        if stop is None:
            raise Exception("Stop not found")

        trip_id = await _stop_parent_trip_id(session, stop)
        await require_trip_access(
            session, trip_id, user, editor=True, not_found_message="Stop not found"
        )

        # Insert the copy right after the original, renumbering everything
        # from there on (same "no gaps" approach as reorder_stops) rather
        # than tacking the copy onto the end of the list.
        new_index = stop.order_index + 1
        parent_filter = _stop_parent_filter(stop.day_id, stop.city_id)
        later_stops = await session.execute(
            select(StopModel).where(parent_filter, StopModel.order_index >= new_index)
        )
        for later_stop in later_stops.scalars().all():
            later_stop.order_index += 1

        duplicate = StopModel(
            day_id=stop.day_id,
            city_id=stop.city_id,
            name=stop.name,
            lat=stop.lat,
            lng=stop.lng,
            order_index=new_index,
            notes=stop.notes,
            start_time=stop.start_time,
            is_important=stop.is_important,
            is_optional=stop.is_optional,
        )
        session.add(duplicate)
        await session.commit()
        return Stop.from_model(duplicate)

    @strawberry.mutation
    async def delete_stop(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        stop = await session.get(StopModel, int(id))
        if stop is None:
            return False

        trip_id = await _stop_parent_trip_id(session, stop)
        await require_trip_access(
            session, trip_id, user, editor=True, not_found_message="Stop not found"
        )

        await session.delete(stop)
        await session.commit()
        return True

    @strawberry.mutation
    async def update_name(
        self, info: strawberry.Info, first_name: str, last_name: str
    ) -> User:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        first_name = first_name.strip()
        last_name = last_name.strip()
        if not first_name or not last_name:
            raise Exception("First name and last name are required")

        session = info.context.session
        user.first_name = first_name
        user.last_name = last_name
        await session.commit()
        return User.from_model(user)

    @strawberry.mutation
    async def change_password(
        self, info: strawberry.Info, current_password: str, new_password: str
    ) -> bool:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        if not verify_password(current_password, user.password_hash):
            raise Exception("Current password is incorrect")

        # Same floor as the signup form's `minLength={8}` - enforced here too
        # since a GraphQL client isn't bound by the frontend's HTML validation.
        if len(new_password) < 8:
            raise Exception("New password must be at least 8 characters")

        session = info.context.session
        user.password_hash = hash_password(new_password)
        await session.commit()
        return True

    @strawberry.mutation
    async def request_password_reset(self, info: strawberry.Info, email: str) -> bool:
        # Always returns True, whether or not the email is registered - a
        # different response for "not found" would let anyone probe which
        # emails have accounts. Same pattern as the reference app's
        # `/forgot-password` REST endpoint.
        session = info.context.session
        result = await session.execute(
            select(UserModel).where(func.lower(UserModel.email) == normalize_email(email))
        )
        user = result.scalar_one_or_none()

        if user is not None:
            reset_token = PasswordResetTokenModel(user_id=user.id)
            session.add(reset_token)
            await session.commit()

            reset_url = f"{settings.client_url}/reset-password?token={reset_token.token}"
            await send_password_reset_email(user.email, reset_url)

        return True

    @strawberry.mutation
    async def reset_password(self, info: strawberry.Info, token: str, new_password: str) -> bool:
        if len(new_password) < 8:
            raise Exception("New password must be at least 8 characters")

        session = info.context.session
        result = await session.execute(
            select(PasswordResetTokenModel).where(PasswordResetTokenModel.token == token)
        )
        reset_token = result.scalar_one_or_none()

        # Same rejection message for "doesn't exist", "already used" and
        # "expired" - no reason to help an attacker distinguish those.
        if reset_token is None or reset_token.used_at is not None or reset_token.is_expired:
            raise Exception("This reset link is invalid or has expired")

        user = await session.get(UserModel, reset_token.user_id)
        user.password_hash = hash_password(new_password)
        reset_token.used_at = datetime.now(timezone.utc)
        await session.commit()
        return True

    @strawberry.mutation
    async def update_avatar_color(self, info: strawberry.Info, avatar_color: str) -> User:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        if avatar_color not in AVATAR_COLORS:
            raise Exception("Invalid avatar color")

        session = info.context.session
        user.avatar_color = avatar_color
        await session.commit()
        return User.from_model(user)

    @strawberry.mutation
    async def update_language(self, info: strawberry.Info, language: str) -> User:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        if language not in LANGUAGE_OPTIONS:
            raise Exception("Invalid language")

        session = info.context.session
        user.language = language
        await session.commit()
        return User.from_model(user)

    @strawberry.mutation
    async def update_directions_use_current_location(
        self, info: strawberry.Info, use_current_location: bool
    ) -> User:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        user.directions_use_current_location = use_current_location
        await session.commit()
        return User.from_model(user)

    # --- Sharing -----------------------------------------------------------
    # These mutations manage the trip owner's share links (any number per
    # permission level - each "Generate link" click makes an independent,
    # separately revocable one) and the collaborators created when someone
    # accepts one. Only the owner can call any of these except
    # `accept_share_invite` itself - `require_trip_owner` (rather than
    # `require_trip_access`) enforces that, so an editor-collaborator can't
    # reshare or remove someone else's access just because they can edit
    # stops.

    @strawberry.mutation
    async def create_share_link(
        self, info: strawberry.Info, trip_id: strawberry.ID, permission: PermissionLevel
    ) -> ShareLink:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        trip = await require_trip_owner(session, int(trip_id), user)

        link = TripShareLinkModel(trip_id=trip.id, permission=permission)
        session.add(link)
        await session.commit()
        return ShareLink.from_model(link)

    @strawberry.mutation
    async def revoke_share_link(
        self, info: strawberry.Info, trip_id: strawberry.ID, link_id: strawberry.ID
    ) -> bool:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        trip = await require_trip_owner(session, int(trip_id), user)

        existing = await _get_owned_share_link(session, trip.id, int(link_id))
        if existing is None:
            return False

        await session.delete(existing)
        await session.commit()
        return True

    @strawberry.mutation
    async def accept_share_invite(self, info: strawberry.Info, token: str) -> Trip:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        link = await session.scalar(
            select(TripShareLinkModel).where(TripShareLinkModel.token == token)
        )
        if link is None or link.is_expired:
            raise Exception("This invite link is invalid or has expired")

        trip = await session.get(TripModel, link.trip_id)
        if trip is None:
            raise Exception("This invite link is invalid or has expired")

        if trip.user_id == user.id:
            # Owners already have full access - accepting your own link is a no-op.
            return Trip.from_model(trip)

        collaborator = await session.scalar(
            select(TripCollaboratorModel).where(
                TripCollaboratorModel.trip_id == trip.id,
                TripCollaboratorModel.user_id == user.id,
            )
        )
        if collaborator is None:
            collaborator_count = await session.scalar(
                select(func.count())
                .select_from(TripCollaboratorModel)
                .where(TripCollaboratorModel.trip_id == trip.id)
            )
            if collaborator_count >= MAX_COLLABORATORS_PER_TRIP:
                raise Exception(
                    f"This trip already has the maximum of {MAX_COLLABORATORS_PER_TRIP} collaborators"
                )
            session.add(
                TripCollaboratorModel(trip_id=trip.id, user_id=user.id, permission=link.permission)
            )
        else:
            collaborator.permission = link.permission

        await session.commit()
        return Trip.from_model(trip)

    @strawberry.mutation
    async def update_collaborator_permission(
        self,
        info: strawberry.Info,
        trip_id: strawberry.ID,
        user_id: strawberry.ID,
        permission: PermissionLevel,
    ) -> Collaborator:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        trip = await require_trip_owner(session, int(trip_id), user)

        collaborator = await session.scalar(
            select(TripCollaboratorModel).where(
                TripCollaboratorModel.trip_id == trip.id,
                TripCollaboratorModel.user_id == int(user_id),
            )
        )
        if collaborator is None:
            raise Exception("Collaborator not found")

        collaborator.permission = permission
        await session.commit()

        collaborator_user = await session.get(UserModel, collaborator.user_id)
        return Collaborator.from_model(collaborator, collaborator_user.email)

    @strawberry.mutation
    async def remove_collaborator(
        self, info: strawberry.Info, trip_id: strawberry.ID, user_id: strawberry.ID
    ) -> bool:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        trip = await require_trip_owner(session, int(trip_id), user)

        collaborator = await session.scalar(
            select(TripCollaboratorModel).where(
                TripCollaboratorModel.trip_id == trip.id,
                TripCollaboratorModel.user_id == int(user_id),
            )
        )
        if collaborator is None:
            return False

        await session.delete(collaborator)
        await session.commit()
        return True
