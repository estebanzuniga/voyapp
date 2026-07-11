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
        session = info.context.session
        result = await session.execute(select(TripModel))
        return [Trip.from_model(trip) for trip in result.scalars().all()]
