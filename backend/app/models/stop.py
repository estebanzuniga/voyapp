from datetime import time

from sqlalchemy import Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Stop(Base):
    __tablename__ = "stops"

    id: Mapped[int] = mapped_column(primary_key=True)
    day_id: Mapped[int] = mapped_column(ForeignKey("days.id"))
    name: Mapped[str]
    lat: Mapped[float]
    lng: Mapped[float]
    notes: Mapped[str | None]
    start_time: Mapped[time | None]
    order_index: Mapped[int]
    # Independent flags rather than a single "priority" enum - the frontend
    # will decide how each renders, but nothing stops a stop being both
    # important *and* optional at the data/API level (e.g. "worth doing if
    # you have time, but a must-see if you go").
    is_important: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    day: Mapped["Day"] = relationship(back_populates="stops")
