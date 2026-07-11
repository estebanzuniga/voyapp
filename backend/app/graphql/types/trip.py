from datetime import date

import strawberry

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
