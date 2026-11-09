
from datetime import datetime, timezone

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import SessionLocal
from models.users import User
from models.sessions import UserSession
from security import hash_session_token

from models.flashcard_decks import Deck

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    session_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db)
) -> User:

    # Require a session cookie.
    if session_token is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required."
        )

    # Find the hashed token in SQLite.
    token_hash = hash_session_token(session_token)

    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == token_hash
        )
    )

    if session is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid session."
        )

    # SQLite may return a datetime without timezone info.
    expires_at = session.expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) >= expires_at:
        raise HTTPException(
            status_code=401,
            detail="Session expired."
        )

    # Retrieve the user associated with the session.
    user = db.get(User, session.user_id)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found."
        )

    return user


def get_owned_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Deck:
    deck = db.get(Deck, deck_id)

    if deck is None or deck.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Deck not found."
        )

    return deck


def get_optional_user(
    session_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db)
) -> User | None:
    if session_token is None:
        return None

    token_hash = hash_session_token(session_token)

    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == token_hash
        )
    )

    if session is None:
        return None

    expires_at = session.expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) >= expires_at:
        return None

    return db.get(User, session.user_id)
