
from __future__ import annotations

from sqlalchemy import ForeignKey, Text, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Profile(Base):
    __tablename__ = "profiles"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )

    bio: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None
    )

    profile_picture: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        default=None
    )

    room_pictures: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="profile"
    )