from datetime import date

import strawberry
from sqlalchemy import func, select

from app.auth.security import create_access_token, hash_password, verify_password
from app.graphql.access import require_trip_access, require_trip_owner
from app.graphql.types.auth import AuthPayload
from app.graphql.types.day import Day
from app.graphql.types.permission import PermissionLevel
from app.graphql.types.share import Collaborator, ShareLink
from app.graphql.types.stop import LocationInput, Stop
from app.graphql.types.trip import Trip
from app.graphql.types.user import User
from app.models.day import Day as DayModel
from app.models.stop import Stop as StopModel
from app.models.trip import Trip as TripModel
from app.models.trip_collaborator import MAX_COLLABORATORS_PER_TRIP
from app.models.trip_collaborator import TripCollaborator as TripCollaboratorModel
from app.models.trip_share_link import TripShareLink as TripShareLinkModel
from app.models.user import User as UserModel


async def _get_owned_share_link(session, trip_id: int, link_id: int) -> TripShareLinkModel | None:
    return await session.scalar(
        select(TripShareLinkModel).where(
            TripShareLinkModel.id == link_id,
            TripShareLinkModel.trip_id == trip_id,
        )
    )


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def signup(self, info: strawberry.Info, email: str, password: str) -> AuthPayload:
        session = info.context.session
        existing = await session.execute(select(UserModel).where(UserModel.email == email))
        if existing.scalar_one_or_none() is not None:
            raise Exception("A user with that email already exists")

        user = UserModel(email=email, password_hash=hash_password(password))
        session.add(user)
        await session.commit()

        token = create_access_token(user.id)
        return AuthPayload(token=token, user=User.from_model(user))

    @strawberry.mutation
    async def login(self, info: strawberry.Info, email: str, password: str) -> AuthPayload:
        session = info.context.session
        result = await session.execute(select(UserModel).where(UserModel.email == email))
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

    @strawberry.mutation
    async def add_stop(
        self,
        info: strawberry.Info,
        day_id: strawberry.ID,
        name: str,
        location: LocationInput,
    ) -> Stop:
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

        next_index = await session.scalar(
            select(func.coalesce(func.max(StopModel.order_index), -1)).where(
                StopModel.day_id == day.id
            )
        )
        stop = StopModel(
            day_id=day.id,
            name=name,
            lat=location.lat,
            lng=location.lng,
            order_index=next_index + 1,
        )
        session.add(stop)
        await session.commit()
        return Stop.from_model(stop)

    @strawberry.mutation
    async def reorder_stops(
        self, info: strawberry.Info, day_id: strawberry.ID, stop_ids: list[strawberry.ID]
    ) -> list[Stop]:
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

        result = await session.execute(select(StopModel).where(StopModel.day_id == day.id))
        stops_by_id = {stop.id: stop for stop in result.scalars().all()}

        if set(stops_by_id) != {int(stop_id) for stop_id in stop_ids}:
            raise Exception("stopIds must match the day's current stops exactly")

        for index, stop_id in enumerate(stop_ids):
            stops_by_id[int(stop_id)].order_index = index
        await session.commit()

        return [Stop.from_model(stops_by_id[int(stop_id)]) for stop_id in stop_ids]

    @strawberry.mutation
    async def move_stop(
        self,
        info: strawberry.Info,
        stop_id: strawberry.ID,
        to_day_id: strawberry.ID,
        to_index: int,
    ) -> Stop:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        stop = await session.get(StopModel, int(stop_id))
        if stop is None:
            raise Exception("Stop not found")

        source_day = await session.get(DayModel, stop.day_id)
        if source_day is None:
            raise Exception("Stop not found")
        await require_trip_access(
            session, source_day.trip_id, user, editor=True, not_found_message="Stop not found"
        )

        target_day = await session.get(DayModel, int(to_day_id))
        if target_day is None:
            raise Exception("Day not found")
        await require_trip_access(
            session, target_day.trip_id, user, editor=True, not_found_message="Day not found"
        )

        if target_day.id != source_day.id:
            remaining_result = await session.execute(
                select(StopModel)
                .where(StopModel.day_id == source_day.id, StopModel.id != stop.id)
                .order_by(StopModel.order_index)
            )
            for index, remaining_stop in enumerate(remaining_result.scalars().all()):
                remaining_stop.order_index = index

        target_stops_result = await session.execute(
            select(StopModel)
            .where(StopModel.day_id == target_day.id, StopModel.id != stop.id)
            .order_by(StopModel.order_index)
        )
        target_stops = list(target_stops_result.scalars().all())
        to_index = max(0, min(to_index, len(target_stops)))
        target_stops.insert(to_index, stop)

        stop.day_id = target_day.id
        for index, target_stop in enumerate(target_stops):
            target_stop.order_index = index

        await session.commit()
        return Stop.from_model(stop)

    @strawberry.mutation
    async def delete_stop(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        stop = await session.get(StopModel, int(id))
        if stop is None:
            return False

        day = await session.get(DayModel, stop.day_id)
        if day is None:
            raise Exception("Stop not found")
        await require_trip_access(
            session, day.trip_id, user, editor=True, not_found_message="Stop not found"
        )

        await session.delete(stop)
        await session.commit()
        return True

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
