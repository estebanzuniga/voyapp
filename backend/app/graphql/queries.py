import strawberry
from sqlalchemy import select

from app.graphql.types.trip import Trip
from app.models.trip import Trip as TripModel


@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Hello, Voyapp!"

    @strawberry.field
    async def my_trips(self, info: strawberry.Info) -> list[Trip]:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        result = await session.execute(
            select(TripModel).where(TripModel.user_id == user.id)
        )
        return [Trip.from_model(trip) for trip in result.scalars().all()]

    @strawberry.field
    async def trip(self, info: strawberry.Info, id: strawberry.ID) -> Trip | None:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        trip = await session.get(TripModel, int(id))
        if trip is None or trip.user_id != user.id:
            return None

        return Trip.from_model(trip)
