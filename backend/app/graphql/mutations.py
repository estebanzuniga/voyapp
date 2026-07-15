from datetime import date

import strawberry
from sqlalchemy import func, select

from app.auth.security import create_access_token, hash_password, verify_password
from app.graphql.types.auth import AuthPayload
from app.graphql.types.day import Day
from app.graphql.types.stop import LocationInput, Stop
from app.graphql.types.trip import Trip
from app.graphql.types.user import User
from app.models.day import Day as DayModel
from app.models.stop import Stop as StopModel
from app.models.trip import Trip as TripModel
from app.models.user import User as UserModel


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
        trip = await session.get(TripModel, int(trip_id))
        if trip is None or trip.user_id != user.id:
            raise Exception("Trip not found")

        next_index = await session.scalar(
            select(func.coalesce(func.max(DayModel.order_index), -1)).where(
                DayModel.trip_id == trip.id
            )
        )
        day = DayModel(trip_id=trip.id, date=date, order_index=next_index + 1)
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

        trip = await session.get(TripModel, day.trip_id)
        if trip is None or trip.user_id != user.id:
            raise Exception("Day not found")

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

        trip = await session.get(TripModel, day.trip_id)
        if trip is None or trip.user_id != user.id:
            raise Exception("Day not found")

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

        trip = await session.get(TripModel, day.trip_id)
        if trip is None or trip.user_id != user.id:
            raise Exception("Day not found")

        result = await session.execute(select(StopModel).where(StopModel.day_id == day.id))
        stops_by_id = {stop.id: stop for stop in result.scalars().all()}

        if set(stops_by_id) != {int(stop_id) for stop_id in stop_ids}:
            raise Exception("stopIds must match the day's current stops exactly")

        for index, stop_id in enumerate(stop_ids):
            stops_by_id[int(stop_id)].order_index = index
        await session.commit()

        return [Stop.from_model(stops_by_id[int(stop_id)]) for stop_id in stop_ids]

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
        trip = await session.get(TripModel, day.trip_id) if day is not None else None
        if trip is None or trip.user_id != user.id:
            raise Exception("Stop not found")

        await session.delete(stop)
        await session.commit()
        return True
