from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.day import Day
    from app.models.trip_collaborator import TripCollaborator
    from app.models.trip_share_link import TripShareLink
    from app.models.user import User


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str]
    start_date: Mapped[date]
    end_date: Mapped[date]
    cover_image: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="trips")
    days: Mapped[list["Day"]] = relationship(back_populates="trip", order_by="Day.date")
    share_links: Mapped[list["TripShareLink"]] = relationship(back_populates="trip")
    collaborators: Mapped[list["TripCollaborator"]] = relationship(back_populates="trip")
