from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.stop import Stop
    from app.models.trip import Trip


class StopCategory(Base):
    """A user-named, trip-scoped tag for classifying stops (e.g. "Food" with
    an emoji) - same "real entity, not a free-text field" reasoning as City:
    a free-text category would fragment on typos/casing, and a category also
    needs to carry its own emoji, which a plain string field couldn't.

    Independent of a stop's day/city parent: `Stop.category_id` is a plain
    nullable FK, unrelated to the "exactly one of a day or a city" CHECK
    constraint on `stops` - a scheduled stop or a city recommendation can
    each be categorized, or left uncategorized, the same way.
    """

    __tablename__ = "stop_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    name: Mapped[str]
    emoji: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    trip: Mapped["Trip"] = relationship(back_populates="stop_categories")
    stops: Mapped[list["Stop"]] = relationship(back_populates="category", order_by="Stop.id")
