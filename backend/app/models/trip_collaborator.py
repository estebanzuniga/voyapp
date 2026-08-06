from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import Permission

if TYPE_CHECKING:
    from app.models.trip import Trip
    from app.models.user import User

# How many collaborators a single trip can have at once. Links themselves
# are unlimited (see TripShareLink) - this instead caps how many people can
# actually be using one, enforced in `accept_share_invite`.
MAX_COLLABORATORS_PER_TRIP = 10


class TripCollaborator(Base):
    """A user's granted access to someone else's trip.

    Created when they accept a `TripShareLink` invite - deliberately kept
    independent of the link itself, so revoking a link later doesn't
    retroactively remove people who already joined through it.
    """

    __tablename__ = "trip_collaborators"
    __table_args__ = (UniqueConstraint("trip_id", "user_id", name="uq_trip_collaborator_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    permission: Mapped[Permission] = mapped_column(Enum(Permission, native_enum=False, length=20))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    trip: Mapped["Trip"] = relationship(back_populates="collaborators")
    user: Mapped["User"] = relationship()
