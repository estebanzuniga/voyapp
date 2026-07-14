from datetime import date

import strawberry

from app.models.day import Day as DayModel


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
