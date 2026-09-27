from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.day import Day
    from app.models.stop import Stop
    from app.models.trip import Trip


class City(Base):
    """A user-named grouping within one trip - e.g. "Paris" or "Tokyo".

    Scoped to a single trip (not shared/deduped across trips or users) since
    there's no need for a global city registry here: creating a "Paris" row
    per trip that has one is simpler than reconciling free-text names against
    a shared table, and trips never need to compare cities across each other.

    Two things hang off a City:
    - `Day.city_id` groups consecutive days under it (the day-list "collapse
      by city" feature).
    - `Stop.city_id` holds undated recommendations for it (the "Stops per
      city" section) - a stop belongs to exactly one of a Day or a City,
      never both, enforced by a CHECK constraint on `stops` (see Stop).
    """

    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    name: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    trip: Mapped["Trip"] = relationship(back_populates="cities")
    stops: Mapped[list["Stop"]] = relationship(back_populates="city", order_by="Stop.order_index")
    days: Mapped[list["Day"]] = relationship(back_populates="city", order_by="Day.date")
