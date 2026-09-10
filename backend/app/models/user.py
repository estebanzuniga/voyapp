from datetime import datetime

from sqlalchemy import Boolean, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def normalize_email(email: str) -> str:
    return email.strip().lower()

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

LANGUAGE_OPTIONS: tuple[str, ...] = ("en", "es")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str]
    first_name: Mapped[str]
    last_name: Mapped[str]
    avatar_color: Mapped[str]
    language: Mapped[str] = mapped_column(default="en", server_default="en")
    directions_use_current_location: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    trips: Mapped[list["Trip"]] = relationship(back_populates="user")

Index("ix_users_email_lower", func.lower(User.email), unique=True)
