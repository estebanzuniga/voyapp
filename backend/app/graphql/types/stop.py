from datetime import time

import strawberry

from app.models.stop import Stop as StopModel


@strawberry.type
class Location:
    lat: float
    lng: float


@strawberry.input
class LocationInput:
    lat: float
    lng: float


@strawberry.type
class Stop:
    id: strawberry.ID
    name: str
    location: Location
    notes: str | None
    start_time: time | None
    order_index: int

    @classmethod
    def from_model(cls, stop: StopModel) -> "Stop":
        return cls(
            id=strawberry.ID(str(stop.id)),
            name=stop.name,
            location=Location(lat=stop.lat, lng=stop.lng),
            notes=stop.notes,
            start_time=stop.start_time,
            order_index=stop.order_index,
        )
