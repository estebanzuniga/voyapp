import secrets
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User

# How long a reset link stays valid after it's requested. Short-lived on
# purpose - if it leaks (forwarded email, shared inbox, etc.) the window for
# misuse is small, and requesting a new one is a single form submit away.
RESET_TOKEN_LIFETIME = timedelta(hours=1)


def _generate_token() -> str:
    # Same approach as TripShareLink's token: unpredictable, URL-safe,
    # unguessable - the Django equivalent is `get_random_string`/
    # `default_token_generator`.
    return secrets.token_urlsafe(32)


def _default_expiry() -> datetime:
    return datetime.now(timezone.utc) + RESET_TOKEN_LIFETIME


class PasswordResetToken(Base):
    """A one-time-use link issued by `requestPasswordReset`.

    `used_at` marks the token consumed (set inside the same transaction
    that updates the password) so a link can't be replayed even within its
    validity window - `resetPassword` treats "used" and "expired" as the
    same rejection.
    """

    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, default=_generate_token)
    # Timezone-aware, like TripShareLink.expires_at - this gets compared
    # against `datetime.now(timezone.utc)` in the resolver, and a naive
    # column would make that comparison fail (or silently misbehave).
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_default_expiry)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    user: Mapped["User"] = relationship()

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at
