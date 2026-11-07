
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    ForeignKey,
    String,
    Integer,
    Boolean,
    DateTime,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="My Room"
    )

    visibility: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="private"
    )

    published: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
    )

    schema_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
    )

    revision: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
    )

    background: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )

    objects: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )

    study_sets: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    owner: Mapped["User"] = relationship(
        "User",
        back_populates="room"
    )
