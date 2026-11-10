
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from sqlalchemy import event, insert
from models.flashcard_decks import Deck


class DeckSocial(Base):
    __tablename__ = "deck_social"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    deck_id: Mapped[int] = mapped_column(
        ForeignKey("decks.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    deck: Mapped["Deck"] = relationship(
        "Deck",
        back_populates="social"
    )

    comments: Mapped[list["DeckComment"]] = relationship(
        "DeckComment",
        back_populates="social",
        cascade="all, delete-orphan"
    )

    likes: Mapped[list["DeckLike"]] = relationship(
        "DeckLike",
        back_populates="social",
        cascade="all, delete-orphan"
    )


class DeckComment(Base):
    __tablename__ = "deck_comments"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    social_id: Mapped[int] = mapped_column(
        ForeignKey("deck_social.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    social: Mapped["DeckSocial"] = relationship(
        "DeckSocial",
        back_populates="comments"
    )

    author: Mapped["User"] = relationship(
        "User",
        back_populates="deck_comments"
    )


class DeckLike(Base):
    __tablename__ = "deck_likes"

    __table_args__ = (
        UniqueConstraint(
            "social_id",
            "user_id",
            name="uq_deck_like_user"
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    social_id: Mapped[int] = mapped_column(
        ForeignKey("deck_social.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    social: Mapped["DeckSocial"] = relationship(
        "DeckSocial",
        back_populates="likes"
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="deck_likes"
    )

@event.listens_for(Deck, "after_insert")
def create_deck_social(mapper, connection, target):
    connection.execute(
        insert(DeckSocial).values(deck_id=target.id)
    )