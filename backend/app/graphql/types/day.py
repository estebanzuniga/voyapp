from datetime import date

import strawberry
from sqlalchemy import select

from app.graphql.types.stop import Stop
from app.models.day import Day as DayModel
from app.models.stop import Stop as StopModel


@strawberry.type
class Day:
    id: strawberry.ID
    date: date
    order_index: int

    @classmethod
    def from_model(cls, day: DayModel) -> "Day":
        return cls(
            id=strawberry.ID(str(day.id)),
            date=day.date,
            order_index=day.order_index,
        )

    @strawberry.field
    async def stops(self, info: strawberry.Info) -> list[Stop]:
        session = info.context.session
        result = await session.execute(
            select(StopModel)
            .where(StopModel.day_id == int(self.id))
            .order_by(StopModel.order_index)
        )
        return [Stop.from_model(stop) for stop in result.scalars().all()]
