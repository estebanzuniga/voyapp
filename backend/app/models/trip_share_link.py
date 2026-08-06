import secrets
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import Permission

SHARE_LINK_LIFETIME = timedelta(hours=24)

if TYPE_CHECKING:
    from app.models.trip import Trip

def _generate_token() -> str:
    # secrets.token_urlsafe is Python's stdlib pick for unpredictable,
    # URL-safe tokens (same idea as Django's get_random_string for things
    # like password-reset links) - 24 random bytes, base64url-encoded.
    return secrets.token_urlsafe(24)


def _default_expiry() -> datetime:
    return datetime.now(timezone.utc) + SHARE_LINK_LIFETIME


class TripShareLink(Base):
    """A shareable invite link for a trip, scoped to one permission level.

    A trip can have any number of links per permission - each "Generate
    link" click makes a new, independently revocable one rather than
    replacing a single canonical link. What's capped instead is how many
    people can actually be *using* one of these links at a time - see
    `MAX_COLLABORATORS_PER_TRIP` on `TripCollaborator`.
    """

    __tablename__ = "trip_share_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    permission: Mapped[Permission] = mapped_column(Enum(Permission, native_enum=False, length=20))
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, default=_generate_token)
    # Timezone-aware (unlike the rest of the codebase's `created_at` columns,
    # which are naive) because the frontend now does real time-window math
    # against this value (the 15-second one-time reveal) - a naive
    # timestamp would get parsed as the *browser's local* time by
    # `new Date(...)`, silently breaking that countdown for anyone not in UTC.
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_default_expiry)

    trip: Mapped["Trip"] = relationship(back_populates="share_links")

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at
