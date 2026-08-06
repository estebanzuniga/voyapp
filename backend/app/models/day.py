from datetime import date

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Day(Base):
    __tablename__ = "days"
    __table_args__ = (UniqueConstraint("trip_id", "date", name="uq_day_trip_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    date: Mapped[date]

    trip: Mapped["Trip"] = relationship(back_populates="days")
    stops: Mapped[list["Stop"]] = relationship(back_populates="day", order_by="Stop.order_index")
