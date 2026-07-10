from datetime import time

from sqlalchemy import ForeignKey
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

    day: Mapped["Day"] = relationship(back_populates="stops")
