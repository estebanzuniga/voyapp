from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.day import Day
    from app.models.city import City
    from app.models.stop_category import StopCategory


class Stop(Base):
    __tablename__ = "stops"
    __table_args__ = (
        CheckConstraint(
            "(day_id IS NULL) != (city_id IS NULL)", name="ck_stop_exactly_one_parent"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    day_id: Mapped[int | None] = mapped_column(ForeignKey("days.id"), default=None)
    city_id: Mapped[int | None] = mapped_column(ForeignKey("cities.id"), default=None)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("stop_categories.id"), default=None)
    name: Mapped[str]
    lat: Mapped[float]
    lng: Mapped[float]
    notes: Mapped[str | None]
    start_time: Mapped[time | None]
    order_index: Mapped[int]
    is_important: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    day: Mapped["Day | None"] = relationship(back_populates="stops")
    city: Mapped["City | None"] = relationship(back_populates="stops")
    category: Mapped["StopCategory | None"] = relationship(back_populates="stops")
