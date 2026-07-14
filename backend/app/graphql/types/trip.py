from datetime import date

import strawberry
from sqlalchemy import select

from app.graphql.types.day import Day
from app.models.day import Day as DayModel
from app.models.trip import Trip as TripModel


@strawberry.type
class Trip:
    id: strawberry.ID
    title: str
    start_date: date
    end_date: date

    @classmethod
    def from_model(cls, trip: TripModel) -> "Trip":
        return cls(
            id=strawberry.ID(str(trip.id)),
            title=trip.title,
            start_date=trip.start_date,
            end_date=trip.end_date,
        )

    @strawberry.field
    async def days(self, info: strawberry.Info) -> list[Day]:
        session = info.context.session
        result = await session.execute(
            select(DayModel)
            .where(DayModel.trip_id == int(self.id))
            .order_by(DayModel.order_index)
        )
        return [Day.from_model(day) for day in result.scalars().all()]
