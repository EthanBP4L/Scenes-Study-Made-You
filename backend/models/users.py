
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    username: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True
    )

    email: Mapped[str] = mapped_column(
        String(254),
        unique=True,
        nullable=False,
        index=True
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    decks: Mapped[list["Deck"]] = relationship(
        "Deck",
        back_populates="owner"
    )

    profile: Mapped["Profile | None"] = relationship(
        "Profile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    room: Mapped["Room | None"] = relationship(
        "Room",
        back_populates="owner",
        uselist=False,
        cascade="all, delete-orphan"
    )

    # Comments written by this user.
    deck_comments: Mapped[list["DeckComment"]] = relationship(
        "DeckComment",
        back_populates="author"
    )

    # Deck likes created by this user.
    deck_likes: Mapped[list["DeckLike"]] = relationship(
        "DeckLike",
        back_populates="user"
    )
