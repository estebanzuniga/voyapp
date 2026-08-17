from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Fixed palette rather than a free-form hex/color-picker input - keeps every
# avatar visually consistent (no one picking a color that's unreadable
# against the app's surfaces) and gives the frontend a finite list of
# swatches to render, sourced from here via `Query.avatar_color_options` so
# the backend stays the single source of truth. Tailwind's 500-weight
# scale, picked for even contrast against both light and dark surfaces.
AVATAR_COLORS: tuple[str, ...] = (
    "#ef4444",  # red
    "#f97316",  # orange
    "#f59e0b",  # amber
    "#84cc16",  # lime
    "#22c55e",  # green
    "#14b8a6",  # teal
    "#06b6d4",  # cyan
    "#3b82f6",  # blue
    "#6366f1",  # indigo
    "#8b5cf6",  # violet
    "#ec4899",  # pink
    "#f43f5e",  # rose
)

# Same reasoning as AVATAR_COLORS: one fixed list the frontend renders from
# (via `Query.language_options`) and `update_language` validates against,
# instead of the frontend hardcoding its own copy that could drift out of
# sync with what translations actually exist.
LANGUAGE_OPTIONS: tuple[str, ...] = ("en", "es")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str]
    first_name: Mapped[str]
    last_name: Mapped[str]
    avatar_color: Mapped[str]
    # ISO 639-1 code. Just a free string rather than a DB enum (like
    # `Permission` elsewhere) since the supported set is expected to grow
    # over time - `Query.language_options` is the source of truth the
    # frontend validates/renders against, same idea as `avatar_color_options`.
    language: Mapped[str] = mapped_column(default="en", server_default="en")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    trips: Mapped[list["Trip"]] = relationship(back_populates="user")
