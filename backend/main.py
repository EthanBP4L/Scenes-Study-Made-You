
from email.mime import text

from opentelemetry.metrics import obj
from security import hash_password, verify_password, generate_session_token, hash_session_token
from datetime import datetime, timedelta, timezone
import requests
from pathlib import Path
from uuid import UUID, uuid4
from typing import Literal
from urllib.parse import unquote, urlsplit

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Response, Cookie, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from services.pdf_service import extract_pdf_text
from services.gemini_service import generate_flashcards
from services.image_service import save_image, UPLOAD_DIR

from database import Base, engine, SessionLocal

from auth import get_current_user, get_optional_user

from models.flashcard_decks import Deck
from models.flashcards import Flashcard
from models.users import User
from models.sessions import UserSession
from models.profiles import Profile
from models.rooms import Room
from models.deck_social import DeckSocial, DeckComment, DeckLike
from models.posts import Post, PostLike, PostComment

from schemas.rooms import RoomWriteRequest, RoomDocument
from schemas.flashcards import FlashcardCreate, FlashcardUpdate, FlashcardBatchCreate
from schemas.flashcard_decks import DeckCreate, DeckUpdate, DeckCreateWithFlashcards
from schemas.users import UserCreate, UserResponse, UserLogin
from schemas.profiles import ProfileResponse, ProfileUpdate
from schemas.deck_social import (
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    DeckSocialResponse,
)
from schemas.posts import (
    PostCreate,
    PostUpdate,
    PostResponse,
    PostCommentCreate,
    PostCommentUpdate,
    PostCommentResponse,
    PostLikeResponse,
)

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, or_, update, func, union_all, literal 
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.attributes import flag_modified

app = FastAPI()


UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads"
)


Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def delete_uploaded_image(image_path: str) -> None:
    relative_path = image_path.removeprefix("/uploads/")
    destination = (UPLOAD_DIR / relative_path).resolve()

    if not destination.is_relative_to(UPLOAD_DIR.resolve()):
        return

    if destination.is_file():
        destination.unlink()

@app.get("/")
def home():
    return {"message": "Study Platform API is running!"}


@app.post("/api/v1/pdf/extract")
async def extract_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    # Limit uploads to 10 MB.
    pdf_bytes = await file.read(10 * 1024 * 1024 + 1)

    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="PDF exceeds the 10 MB limit."
        )

@app.post("/api/v1/decks/generate", status_code=201)
def generate_and_save_deck(
    file: UploadFile = File(...),
    name: str = Form(..., min_length=1, max_length=150),
    description: str | None = Form(default=None, max_length=500),
    count: int = Form(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate the uploaded PDF.
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    # Read and enforce the 10 MB limit.
    # This endpoint is synchronous, so use file.file.read().
    pdf_bytes = file.file.read(10 * 1024 * 1024 + 1)

    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="PDF exceeds the 10 MB limit."
        )

    # Extract the document text.
    try:
        text = extract_pdf_text(pdf_bytes)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to process this PDF."
        )

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable text found in this PDF."
        )

    # Generate flashcards using Gemini.
    try:
        generated_cards = generate_flashcards(text, count)
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="AI flashcard generation failed."
        )

    # Validate generated flashcards before saving.
    try:
        cards = [
            FlashcardCreate.model_validate(card)
            for card in generated_cards
        ]

        if not 1 <= len(cards) <= 50:
            raise ValueError("Invalid flashcard count.")

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="AI returned invalid flashcards."
        )

    # Create the deck and attach its flashcards.
    new_deck = Deck(
        name=name,
        description=description,
        is_public=False,
        owner_id=current_user.id
    )

    new_deck.flashcards.extend(
        Flashcard(
            question=card.question,
            answer=card.answer
        )
        for card in cards
    )

    # Save everything in one transaction.
    try:
        db.add(new_deck)
        db.commit()
        db.refresh(new_deck)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save the generated deck."
        )

    return {
        "id": new_deck.id,
        "name": new_deck.name,
        "description": new_deck.description,
        "is_public": new_deck.is_public,
        "created_at": new_deck.created_at,
        "flashcards": [
            {
                "id": card.id,
                "question": card.question,
                "answer": card.answer
            }
            for card in new_deck.flashcards
        ]
    }
    
@app.post("/api/v1/flashcards/generate")
async def create_flashcards(
    file: UploadFile = File(...),
    count: int = Form(default=10, ge=1, le=50)
):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    # Limit PDF uploads to 10 MB.
    pdf_bytes = await file.read(10 * 1024 * 1024 + 1)

    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="PDF exceeds the 10 MB limit."
        )

    try:
        text = extract_pdf_text(pdf_bytes)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to extract text from this PDF."
        )

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable text found in this PDF."
        )


    try:
        flashcards = generate_flashcards(text, count)
    except Exception:
        import logging
        logging.exception("Gemini flashcard generation failed")

        raise HTTPException(
            status_code=502,
            detail="Flashcard generation failed."
        )
    return {
        "filename": file.filename,
        "flashcards": flashcards
    }


@app.post("/api/v1/decks", status_code=201)
def create_deck(
    deck_data: DeckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    new_deck = Deck(
        name=deck_data.name,
        description=deck_data.description,
        is_public=deck_data.is_public,
        owner_id=current_user.id
    )

    db.add(new_deck)

    try:
        db.commit()
        db.refresh(new_deck)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save the study deck."
        )

    return {
        "id": new_deck.id,
        "name": new_deck.name,
        "description": new_deck.description,
        "is_public": new_deck.is_public,
        "created_at": new_deck.created_at
    }



@app.post("/api/v1/decks/{deck_id}/flashcards", status_code=201)
def create_flashcard(
    deck_id: int,
    flashcard_data: FlashcardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deck = db.get(Deck, deck_id)

    if deck is None or deck.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Deck not found."
        )

    new_flashcard = Flashcard(
        deck_id=deck_id,
        question=flashcard_data.question,
        answer=flashcard_data.answer
    )

    try:
        db.add(new_flashcard)
        db.commit()
        db.refresh(new_flashcard)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create flashcard."
        )

    return {
        "id": new_flashcard.id,
        "deck_id": new_flashcard.deck_id,
        "question": new_flashcard.question,
        "answer": new_flashcard.answer
    }




@app.get("/api/v1/decks/public")
def get_public_decks(
    q: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: Literal[
        "newest",
        "oldest",
        "most_liked",
        "most_discussed"
    ] = "newest",
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    # Aggregate likes per social record.
    likes_subquery = (
        select(
            DeckLike.social_id.label("social_id"),
            func.count(DeckLike.id).label("likes_count")
        )
        .group_by(DeckLike.social_id)
        .subquery()
    )

    # Aggregate comments per social record.
    comments_subquery = (
        select(
            DeckComment.social_id.label("social_id"),
            func.count(DeckComment.id).label("comments_count")
        )
        .group_by(DeckComment.social_id)
        .subquery()
    )

    likes_count = func.coalesce(
        likes_subquery.c.likes_count, 0
    )

    comments_count = func.coalesce(
        comments_subquery.c.comments_count, 0
    )

    # Only public decks are discoverable.
    filters = [Deck.is_public.is_(True)]

    if q is not None and q.strip():
        search_term = f"%{q.strip()}%"

        filters.append(
            or_(
                Deck.name.ilike(search_term),
                Deck.description.ilike(search_term)
            )
        )

    # Count matching decks before pagination.
    total = db.scalar(
        select(func.count(Deck.id)).where(*filters)
    ) or 0

    query = (
        select(
            Deck,
            likes_count.label("likes_count"),
            comments_count.label("comments_count")
        )
        .outerjoin(
            DeckSocial,
            DeckSocial.deck_id == Deck.id
        )
        .outerjoin(
            likes_subquery,
            likes_subquery.c.social_id == DeckSocial.id
        )
        .outerjoin(
            comments_subquery,
            comments_subquery.c.social_id == DeckSocial.id
        )
        .options(selectinload(Deck.owner))
        .where(*filters)
    )

    if sort == "oldest":
        query = query.order_by(
            Deck.created_at.asc(),
            Deck.id.asc()
        )
    elif sort == "most_liked":
        query = query.order_by(
            likes_count.desc(),
            Deck.created_at.desc(),
            Deck.id.desc()
        )
    elif sort == "most_discussed":
        query = query.order_by(
            comments_count.desc(),
            Deck.created_at.desc(),
            Deck.id.desc()
        )
    else:
        query = query.order_by(
            Deck.created_at.desc(),
            Deck.id.desc()
        )

    offset = (page - 1) * page_size

    rows = db.execute(
        query.offset(offset).limit(page_size)
    ).all()

    # Fetch likes belonging to the current user
    # for only the decks on this page.
    liked_deck_ids = set()

    if current_user is not None and rows:
        page_deck_ids = [deck.id for deck, _, _ in rows]

        liked_deck_ids = set(
            db.scalars(
                select(DeckSocial.deck_id)
                .join(
                    DeckLike,
                    DeckLike.social_id == DeckSocial.id
                )
                .where(
                    DeckSocial.deck_id.in_(page_deck_ids),
                    DeckLike.user_id == current_user.id
                )
            ).all()
        )

    items = []

    for deck, deck_likes, deck_comments in rows:
        items.append({
            "id": deck.id,
            "name": deck.name,
            "description": deck.description,
            "is_public": deck.is_public,
            "created_at": deck.created_at,
            "owner": {
                "id": deck.owner.id,
                "username": deck.owner.username
            } if deck.owner else None,
            "likes_count": deck_likes,
            "comments_count": deck_comments,
            "liked_by_me": deck.id in liked_deck_ids
        })

    return {
        "items": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (
                (total + page_size - 1) // page_size
            ),
            "has_next": offset + len(items) < total
        }
    }




@app.get("/api/v1/decks/{deck_id}")
def get_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    deck = db.get(Deck, deck_id)

    if deck is None:
        raise HTTPException(
            status_code=404,
            detail="Deck not found."
        )

    is_owner = (
        current_user is not None
        and deck.owner_id == current_user.id
    )

    if not deck.is_public and not is_owner:
        raise HTTPException(
            status_code=404,
            detail="Deck not found."
        )

    return {
        "id": deck.id,
        "name": deck.name,
        "description": deck.description,
        "is_public": deck.is_public,
        "created_at": deck.created_at,
        "flashcards": [
            {
                "id": card.id,
                "question": card.question,
                "answer": card.answer
            }
            for card in deck.flashcards
        ]
    }





@app.get("/api/v1/decks")
def get_my_decks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decks = db.scalars(
        select(Deck)
        .where(Deck.owner_id == current_user.id)
        .order_by(Deck.created_at.desc())
    ).all()

    return [
        {
            "id": deck.id,
            "name": deck.name,
            "description": deck.description,
            "is_public": deck.is_public,
            "created_at": deck.created_at
        }
        for deck in decks
    ]


@app.get("/api/v1/users/{user_id}/study-sets")
def get_user_study_sets(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    query = select(Deck).where(
        Deck.owner_id == user_id
    )

    # Only the owner can see their private decks.
    if current_user is None or current_user.id != user_id:
        query = query.where(Deck.is_public.is_(True))

    decks = db.scalars(
        query.order_by(Deck.created_at.desc())
    ).all()

    return [
        {
            "id": deck.id,
            "name": deck.name,
            "description": deck.description,
            "is_public": deck.is_public,
            "created_at": deck.created_at
        }
        for deck in decks
    ]



@app.delete("/api/v1/decks/{deck_id}/flashcards/{flashcard_id}")
def delete_flashcard(
    deck_id: int,
    flashcard_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deck = db.get(Deck, deck_id)

    if deck is None or deck.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Deck not found."
        )

    flashcard = db.scalar(
        select(Flashcard).where(
            Flashcard.id == flashcard_id,
            Flashcard.deck_id == deck_id
        )
    )

    if flashcard is None:
        raise HTTPException(
            status_code=404,
            detail="Flashcard not found."
        )

    try:
        db.delete(flashcard)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete flashcard."
        )

    return {
        "message": "Flashcard deleted successfully."
    }



@app.delete(
    "/api/v1/decks/{deck_id}",
    status_code=204
)
def delete_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deck = db.get(Deck, deck_id)


    deck = db.get(Deck, deck_id)

    if deck is None or deck.owner_id != current_user.id:
        raise HTTPException(
        status_code=404,
        detail="Deck not found."
    )


    try:
        db.delete(deck)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete the study deck."
        )


@app.patch("/api/v1/decks/{deck_id}")
def update_deck(
    deck_id: int,
    deck_data: DeckUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deck = db.get(Deck, deck_id)

    if deck is None or deck.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Deck not found."
        )

    updates = deck_data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(deck, field, value)

    try:
        db.commit()
        db.refresh(deck)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update deck."
        )

    return {
        "id": deck.id,
        "name": deck.name,
        "description": deck.description,
        "is_public": deck.is_public,
        "created_at": deck.created_at
    }




@app.patch("/api/v1/decks/{deck_id}/flashcards/{flashcard_id}")
def update_flashcard(
    deck_id: int,
    flashcard_id: int,
    flashcard_data: FlashcardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deck = db.get(Deck, deck_id)

    if deck is None or deck.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Deck not found."
        )

    flashcard = db.scalar(
        select(Flashcard).where(
            Flashcard.id == flashcard_id,
            Flashcard.deck_id == deck_id
        )
    )

    if flashcard is None:
        raise HTTPException(
            status_code=404,
            detail="Flashcard not found."
        )

    updates = flashcard_data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(flashcard, field, value)

    try:
        db.commit()
        db.refresh(flashcard)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update flashcard."
        )

    return {
        "id": flashcard.id,
        "deck_id": flashcard.deck_id,
        "question": flashcard.question,
        "answer": flashcard.answer
    }




@app.post("/api/v1/decks/{deck_id}/flashcards/batch", status_code=201)
def create_flashcards_batch(
    deck_id: int,
    batch_data: FlashcardBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deck = db.get(Deck, deck_id)

    if deck is None or deck.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Deck not found."
        )

    new_flashcards = [
        Flashcard(
            deck_id=deck_id,
            question=card.question,
            answer=card.answer
        )
        for card in batch_data.flashcards
    ]

    try:
        db.add_all(new_flashcards)
        db.commit()

        for flashcard in new_flashcards:
            db.refresh(flashcard)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create flashcards."
        )

    return {
        "deck_id": deck_id,
        "created_count": len(new_flashcards),
        "flashcards": [
            {
                "id": flashcard.id,
                "question": flashcard.question,
                "answer": flashcard.answer
            }
            for flashcard in new_flashcards
        ]
    }



@app.post("/api/v1/decks/with-flashcards", status_code=201)
def create_deck_with_flashcards(
    deck_data: DeckCreateWithFlashcards,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_deck = Deck(
        name=deck_data.name,
        description=deck_data.description,
        is_public=deck_data.is_public,
        owner_id=current_user.id
    )

    new_flashcards = [
        Flashcard(
            question=card.question,
            answer=card.answer
        )
        for card in deck_data.flashcards
    ]

    new_deck.flashcards.extend(new_flashcards)

    try:
        db.add(new_deck)
        db.commit()
        db.refresh(new_deck)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save the deck and its flashcards."
        )

    return {
        "id": new_deck.id,
        "name": new_deck.name,
        "description": new_deck.description,
        "is_public": new_deck.is_public,
        "created_at": new_deck.created_at,
        "flashcards": [
            {
                "id": card.id,
                "question": card.question,
                "answer": card.answer
            }
            for card in new_deck.flashcards
        ]
    }



@app.post(
    "/api/v1/users/register",
    response_model=UserResponse,
    status_code=201
)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    username = user_data.username.lower()
    email = str(user_data.email).lower()

    if db.scalar(select(User).where(User.username == username)):
        raise HTTPException(
            status_code=409,
            detail="Username is already taken."
        )

    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(
            status_code=409,
            detail="Email is already registered."
        )

    new_user = User(
        username=username,
        email=email,
        hashed_password=hash_password(user_data.password)
    )

    new_profile = Profile(
        user=new_user,
        bio=None,
        profile_picture=None,
        room_pictures=[]
    )

    try:
        db.add(new_user)
        db.add(new_profile)

        db.commit()
        db.refresh(new_user)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Username or email is already registered."
        )

    return new_user



@app.post("/api/v1/users/login")
def login_user(
    login_data: UserLogin,
    response: Response,
    db: Session = Depends(get_db)
):
    email = str(login_data.email).lower()

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if user is None or not verify_password(
        login_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    # Generate a secure session token.
    token = generate_session_token()

    # Set the session expiration to 7 days.
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    # Store only the token hash in SQLite.
    new_session = UserSession(
        user_id=user.id,
        token_hash=hash_session_token(token),
        expires_at=expires_at
    )

    try:
        db.add(new_session)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create login session."
        )

    # Send the session token in an HTTP-only cookie.
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=False,  # Local HTTP development only.
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )

    return {
        "message": "Login successful.",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }


@app.post("/api/v1/users/logout")
def logout_user(
    response: Response,
    session_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db)
):
    if session_token is not None:
        token_hash = hash_session_token(session_token)

        session = db.scalar(
            select(UserSession).where(
                UserSession.token_hash == token_hash
            )
        )

        if session is not None:
            try:
                db.delete(session)
                db.commit()
            except Exception:
                db.rollback()
                raise HTTPException(
                    status_code=500,
                    detail="Unable to invalidate session."
                )

    # Remove the session cookie from the browser.
    response.delete_cookie(
        key="session_token",
        path="/",
        samesite="lax"
    )

    return {
        "message": "Logged out successfully."
    }

@app.get(
    "/api/v1/users/me",
    response_model=UserResponse
)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user

@app.get(
    "/api/v1/users/{user_id}/profile",
    response_model=ProfileResponse
)

def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db)
):
    profile = db.get(Profile, user_id)

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found."
        )

    return {
        "user_id": profile.user_id,
        "username": profile.user.username,
        "bio": profile.bio,
        "profile_picture": profile.profile_picture,
        "room_pictures": profile.room_pictures
    }


@app.patch(
    "/api/v1/users/me/profile",
    response_model=ProfileResponse
)
def update_my_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.get(Profile, current_user.id)

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found."
        )

    updates = profile_data.model_dump(exclude_unset=True)

    if "bio" in updates:
        profile.bio = updates["bio"]

    if "room_pictures" in updates:
        requested = updates["room_pictures"]

        if requested is None:
            raise HTTPException(
                status_code=422,
                detail="Room pictures cannot be null."
            )

        existing = profile.room_pictures or []

        if (
            len(requested) != len(existing)
            or len(set(requested)) != len(requested)
            or set(requested) != set(existing)
        ):
            raise HTTPException(
                status_code=422,
                detail="You may only reorder your existing room pictures."
            )

        profile.room_pictures = requested
        flag_modified(profile, "room_pictures")

    db.commit()
    db.refresh(profile)

    return {
        "user_id": profile.user_id,
        "username": current_user.username,
        "bio": profile.bio,
        "profile_picture": profile.profile_picture,
        "room_pictures": profile.room_pictures
    }


@app.post(
    "/api/v1/users/me/profile/picture",
    response_model=ProfileResponse
)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.get(Profile, current_user.id)

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found."
        )

    new_path = await save_image(
        file=file,
        category="profiles",
        user_id=current_user.id
    )

    old_path = profile.profile_picture
    profile.profile_picture = new_path

    try:
        db.commit()
        db.refresh(profile)
    except Exception:
        db.rollback()
        delete_uploaded_image(new_path)
        raise

    if old_path:
        delete_uploaded_image(old_path)

    return {
        "user_id": profile.user_id,
        "username": current_user.username,
        "bio": profile.bio,
        "profile_picture": profile.profile_picture,
        "room_pictures": profile.room_pictures
    }


@app.post(
    "/api/v1/users/me/profile/room-pictures",
    response_model=ProfileResponse
)
async def upload_room_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.get(Profile, current_user.id)

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found."
        )

    existing = profile.room_pictures or []

    if len(existing) >= 30:
        raise HTTPException(
            status_code=400,
            detail="Maximum of 30 room pictures allowed."
        )

    new_path = await save_image(
        file=file,
        category="rooms",
        user_id=current_user.id
    )

    profile.room_pictures = [*existing, new_path]

    try:
        db.commit()
        db.refresh(profile)
    except Exception:
        db.rollback()
        delete_uploaded_image(new_path)
        raise

    return {
        "user_id": profile.user_id,
        "username": current_user.username,
        "bio": profile.bio,
        "profile_picture": profile.profile_picture,
        "room_pictures": profile.room_pictures
    }


@app.delete(
    "/api/v1/users/me/profile/room-pictures/{image_id}",
    status_code=204
)
def delete_room_picture(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.get(Profile, current_user.id)

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found."
        )

    try:
        parsed_id = UUID(image_id.split(".")[0])

        if parsed_id.hex != image_id.split(".")[0]:
            raise ValueError()

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid image identifier."
        )

    existing = profile.room_pictures or []

    matching = [
        path for path in existing
        if Path(path).name == image_id
    ]

    if not matching:
        raise HTTPException(
            status_code=404,
            detail="Room picture not found."
        )

    image_path = matching[0]

    profile.room_pictures = [
        path for path in existing
        if path != image_path
    ]

    db.commit()

    delete_uploaded_image(image_path)

    return Response(status_code=204)


@app.get(
    "/api/v1/me/zimmer",
    response_model=RoomDocument
)
def get_my_room(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    room = db.scalar(
        select(Room).where(
            Room.owner_id == current_user.id
        )
    )

    if room is None:
        raise HTTPException(
            status_code=404,
            detail="Room not found."
        )

    return {
        "schemaVersion": room.schema_version,
        "id": room.id,
        "ownerId": room.owner_id,
        "revision": room.revision,
        "name": room.name,
        "visibility": room.visibility,
        "published": room.published,
        "background": room.background,
        "objects": room.objects,
        "studySets": room.study_sets,
        "updatedAt": room.updated_at
    }


@app.get(
    "/api/v1/zimmers/{zimmer_id}",
    response_model=RoomDocument
)
def get_public_room(
    zimmer_id: str,
    db: Session = Depends(get_db)
):
    room = db.scalar(
        select(Room).where(
            Room.id == zimmer_id,
            Room.visibility == "public",
            Room.published == True
        )
    )

    if room is None:
        raise HTTPException(
            status_code=404,
            detail="Room not found."
        )

    return {
        "schemaVersion": room.schema_version,
        "id": room.id,
        "ownerId": room.owner_id,
        "revision": room.revision,
        "name": room.name,
        "visibility": room.visibility,
        "published": room.published,
        "background": room.background,
        "objects": room.objects,
        "studySets": room.study_sets,
        "updatedAt": room.updated_at
    }



# Approved SCENES assets shipped with the frontend.
#
# Add the exact paths from frontend/lib/graphicsLibrary
# and any other bundled media you intentionally expose.
# These paths must match the mediaUrl values sent by the frontend.
SCENES_BUILTIN_MEDIA = frozenset({
    "/graphics/backgrounds/lavender-clouds-v2.gif",
})



def is_allowed_room_media(
    media_url: str | None,
    allowed_uploads: set[str],
) -> bool:
    """
    Validate media referenced by a Zimmer.

    Supported:
    - All built-in SCENES assets under /graphics/
    - User-uploaded media owned by the current user
    - Objects without media

    External URLs are not yet supported.
    """

    if media_url is None:
        return True

    if not isinstance(media_url, str):
        return False

    if not media_url.startswith("/"):
        return False

    if media_url.startswith("//"):
        return False

    if "\\" in media_url or "%" in media_url:
        return False

    parsed = urlsplit(media_url)

    if (
        parsed.scheme
        or parsed.netloc
        or parsed.query
        or parsed.fragment
    ):
        return False

    path = parsed.path

    if any(
        segment in ("", ".", "..")
        for segment in path[1:].split("/")
    ):
        return False

    # Built-in public SCENES graphics.
    # Includes every sticker, GIF, image, and background
    # bundled under frontend/public/graphics/.
    if path.startswith("/graphics/"):
        return True

    # User-uploaded assets require ownership.
    if path.startswith("/uploads/"):
        return path in allowed_uploads

    return False



@app.put(
    "/api/v1/me/zimmer",
    response_model=RoomDocument
)
def save_my_room(
    room_data: RoomWriteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_room = db.scalar(
        select(Room).where(
            Room.owner_id == current_user.id
        )
    )

    # Collect images uploaded by the current user.
    profile = db.get(Profile, current_user.id)

    allowed_images = (
        set(profile.room_pictures or [])
        if profile
        else set()
    )

    if profile and profile.profile_picture:
        allowed_images.add(profile.profile_picture)

    # Collect all media references in the room.
    media_references = [
        room_data.background.mediaUrl
    ]

    for obj in room_data.objects:
        media_references.append(obj.mediaUrl)
        media_references.append(
            obj.appearance.backgroundImage
        )

        # Study-set widgets may reference only decks
        # owned by the current user.
        if obj.type == "study-sets":
            if obj.dataSourceId is not None:
                if (
                    not obj.dataSourceId.isdecimal()
                    or int(obj.dataSourceId) < 1
                ):
                    raise HTTPException(
                        status_code=422,
                        detail="Invalid study-set reference."
                    )

                deck = db.get(
                    Deck,
                    int(obj.dataSourceId)
                )

                if (
                    deck is None
                    or deck.owner_id != current_user.id
                ):
                    raise HTTPException(
                        status_code=422,
                        detail=(
                            "Study set must belong "
                            "to the room owner."
                        )
                    )

    for media_url in media_references:
        if not is_allowed_room_media(
            media_url,
            allowed_images
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Room references an unauthorized "
                    f"or unsupported media asset: {media_url}"
                    )
        )

    now = datetime.now(timezone.utc)

    # Convert validated Pydantic objects into
    # JSON-compatible database values.
    background = (
        room_data.background.model_dump(
            mode="json"
        )
    )

    objects = [
        obj.model_dump(mode="json")
        for obj in room_data.objects
    ]

    study_sets = (
        room_data.studySets.model_dump(
            mode="json"
        )
    )

    # CREATE ROOM
    if existing_room is None:
        if room_data.expectedRevision is not None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Room does not exist. "
                    "Expected revision must be null."
                )
            )

        room = Room(
            id=str(uuid4()),
            owner_id=current_user.id,
            name=room_data.name,
            visibility=room_data.visibility,
            published=room_data.published,
            schema_version=room_data.schemaVersion,
            revision=1,
            background=background,
            objects=objects,
            study_sets=study_sets,
            updated_at=now
        )

        db.add(room)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()

            raise HTTPException(
                status_code=409,
                detail=(
                    "A room already exists "
                    "for this user."
                )
            )

        db.refresh(room)

    # UPDATE EXISTING ROOM
    else:
        if room_data.expectedRevision is None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Room already exists. "
                    "Provide its current revision."
                )
            )

        # Atomic revision check prevents stale writes.
        result = db.execute(
            update(Room)
            .where(
                Room.owner_id == current_user.id,
                Room.revision == room_data.expectedRevision
            )
            .values(
                name=room_data.name,
                visibility=room_data.visibility,
                published=room_data.published,
                schema_version=room_data.schemaVersion,
                revision=Room.revision + 1,
                background=background,
                objects=objects,
                study_sets=study_sets,
                updated_at=now
            )
        )

        if result.rowcount != 1:
            db.rollback()

            raise HTTPException(
                status_code=409,
                detail=(
                    "Room has changed. "
                    "Reload before saving."
                )
            )

        db.commit()

        room = db.scalar(
            select(Room).where(
                Room.owner_id == current_user.id
            )
        )

    # Return the updated document.
    return {
        "schemaVersion": room.schema_version,
        "id": room.id,
        "ownerId": room.owner_id,
        "revision": room.revision,
        "name": room.name,
        "visibility": room.visibility,
        "published": room.published,
        "background": room.background,
        "objects": room.objects,
        "studySets": room.study_sets,
        "updatedAt": room.updated_at
    }

@app.get(
    "/api/v1/decks/{deck_id}/social",
    response_model=DeckSocialResponse
)
def get_deck_social(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    deck = db.get(Deck, deck_id)

    if deck is None:
        raise HTTPException(
            status_code=404,
            detail="Deck not found."
        )

    is_owner = (
        current_user is not None
        and deck.owner_id == current_user.id
    )

    if not deck.is_public and not is_owner:
        raise HTTPException(
            status_code=404,
            detail="Deck not found."
        )

    social = deck.social

    if social is None:
        return DeckSocialResponse(
            deck_id=deck.id,
            likes_count=0,
            comments_count=0,
            liked_by_me=False
        )

    liked_by_me = (
        current_user is not None
        and any(
            like.user_id == current_user.id
            for like in social.likes
        )
    )

    return DeckSocialResponse(
        deck_id=deck.id,
        likes_count=len(social.likes),
        comments_count=len(social.comments),
        liked_by_me=liked_by_me
    )

# ============================================================
# POST ROOM — SOCIAL INTERACTIONS
# ============================================================


def get_social_accessible_deck(
    deck_id: int,
    db: Session,
    current_user: User | None
) -> Deck:
    """
    Public decks are accessible to everyone.
    Private decks are accessible only to their owner.
    """

    deck = db.get(Deck, deck_id)

    if deck is None:
        raise HTTPException(
            status_code=404,
            detail="Deck not found."
        )

    is_owner = (
        current_user is not None
        and deck.owner_id == current_user.id
    )

    if not deck.is_public and not is_owner:
        raise HTTPException(
            status_code=404,
            detail="Deck not found."
        )

    return deck


def get_social_interaction_deck(
    deck_id: int,
    db: Session
) -> Deck:
    """
    Likes and comments are allowed only on public decks.
    """

    deck = db.get(Deck, deck_id)

    if deck is None or not deck.is_public:
        raise HTTPException(
            status_code=404,
            detail="Public deck not found."
        )

    return deck


def serialize_deck_comment(comment: DeckComment) -> dict:
    return {
        "id": comment.id,
        "user_id": comment.user_id,
        "username": comment.author.username,
        "content": comment.content,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at
    }


# ============================================================
# LIKE A PUBLIC DECK
# ============================================================

@app.post("/api/v1/decks/{deck_id}/like")
def like_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deck = get_social_interaction_deck(deck_id, db)

    social = deck.social

    if social is None:
        raise HTTPException(
            status_code=500,
            detail="Deck social record is missing."
        )

    existing_like = db.scalar(
        select(DeckLike).where(
            DeckLike.social_id == social.id,
            DeckLike.user_id == current_user.id
        )
    )

    if existing_like is not None:
        raise HTTPException(
            status_code=409,
            detail="You have already liked this deck."
        )

    new_like = DeckLike(
        social_id=social.id,
        user_id=current_user.id
    )

    try:
        db.add(new_like)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="You have already liked this deck."
        )
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to like deck."
        )

    likes_count = db.scalar(
        select(func.count(DeckLike.id)).where(
            DeckLike.social_id == social.id
        )
    )

    return {
        "deck_id": deck.id,
        "liked_by_me": True,
        "likes_count": likes_count
    }


# ============================================================
# UNLIKE A PUBLIC DECK
# ============================================================

@app.delete("/api/v1/decks/{deck_id}/like")
def unlike_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deck = get_social_interaction_deck(deck_id, db)

    social = deck.social

    if social is None:
        raise HTTPException(
            status_code=500,
            detail="Deck social record is missing."
        )

    existing_like = db.scalar(
        select(DeckLike).where(
            DeckLike.social_id == social.id,
            DeckLike.user_id == current_user.id
        )
    )

    if existing_like is None:
        raise HTTPException(
            status_code=404,
            detail="You have not liked this deck."
        )

    try:
        db.delete(existing_like)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to unlike deck."
        )

    likes_count = db.scalar(
        select(func.count(DeckLike.id)).where(
            DeckLike.social_id == social.id
        )
    )

    return {
        "deck_id": deck.id,
        "liked_by_me": False,
        "likes_count": likes_count
    }


# ============================================================
# GET DECK COMMENTS
# ============================================================

@app.get(
    "/api/v1/decks/{deck_id}/comments",
    response_model=list[CommentResponse]
)
def get_deck_comments(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    deck = get_social_accessible_deck(
        deck_id,
        db,
        current_user
    )

    social = deck.social

    if social is None:
        return []

    comments = db.scalars(
        select(DeckComment)
        .where(DeckComment.social_id == social.id)
        .order_by(
            DeckComment.created_at.asc(),
            DeckComment.id.asc()
        )
    ).all()

    return [
        serialize_deck_comment(comment)
        for comment in comments
    ]


# ============================================================
# CREATE DECK COMMENT
# ============================================================

@app.post(
    "/api/v1/decks/{deck_id}/comments",
    response_model=CommentResponse,
    status_code=201
)
def create_deck_comment(
    deck_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deck = get_social_interaction_deck(deck_id, db)

    content = comment_data.content.strip()

    if not content:
        raise HTTPException(
            status_code=422,
            detail="Comment cannot be empty."
        )

    social = deck.social

    if social is None:
        raise HTTPException(
            status_code=500,
            detail="Deck social record is missing."
        )

    comment = DeckComment(
        social_id=social.id,
        user_id=current_user.id,
        content=content
    )

    try:
        db.add(comment)
        db.commit()
        db.refresh(comment)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create comment."
        )

    return serialize_deck_comment(comment)


# ============================================================
# EDIT OWN COMMENT
# ============================================================

@app.patch(
    "/api/v1/decks/{deck_id}/comments/{comment_id}",
    response_model=CommentResponse
)
def update_deck_comment(
    deck_id: int,
    comment_id: int,
    comment_data: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deck = get_social_interaction_deck(deck_id, db)

    social = deck.social

    if social is None:
        raise HTTPException(
            status_code=404,
            detail="Comment not found."
        )

    comment = db.scalar(
        select(DeckComment).where(
            DeckComment.id == comment_id,
            DeckComment.social_id == social.id
        )
    )

    if comment is None:
        raise HTTPException(
            status_code=404,
            detail="Comment not found."
        )

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only edit your own comments."
        )

    content = comment_data.content.strip()

    if not content:
        raise HTTPException(
            status_code=422,
            detail="Comment cannot be empty."
        )

    comment.content = content
    comment.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(comment)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update comment."
        )

    return serialize_deck_comment(comment)


# ============================================================
# DELETE OWN COMMENT
# ============================================================

@app.delete(
    "/api/v1/decks/{deck_id}/comments/{comment_id}",
    status_code=204
)
def delete_deck_comment(
    deck_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deck = get_social_interaction_deck(deck_id, db)

    social = deck.social

    if social is None:
        raise HTTPException(
            status_code=404,
            detail="Comment not found."
        )

    comment = db.scalar(
        select(DeckComment).where(
            DeckComment.id == comment_id,
            DeckComment.social_id == social.id
        )
    )

    if comment is None:
        raise HTTPException(
            status_code=404,
            detail="Comment not found."
        )

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own comments."
        )

    try:
        db.delete(comment)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete comment."
        )

    return Response(status_code=204)


# ============================================================
# SCENES POST ROOM — STANDALONE SOCIAL POSTS
# ============================================================


def get_existing_post(
    post_id: int,
    db: Session,
) -> Post:
    post = db.get(Post, post_id)

    if post is None:
        raise HTTPException(
            status_code=404,
            detail="Post not found."
        )

    return post


def get_owned_post(
    post_id: int,
    db: Session,
    current_user: User,
) -> Post:
    post = get_existing_post(post_id, db)

    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only modify your own posts."
        )

    return post


def serialize_post(
    post: Post,
    db: Session,
    current_user: User | None,
) -> dict:
    likes_count = db.scalar(
        select(func.count(PostLike.id)).where(
            PostLike.post_id == post.id
        )
    ) or 0

    comments_count = db.scalar(
        select(func.count(PostComment.id)).where(
            PostComment.post_id == post.id
        )
    ) or 0

    liked_by_me = False

    if current_user is not None:
        liked_by_me = db.scalar(
            select(PostLike.id).where(
                PostLike.post_id == post.id,
                PostLike.user_id == current_user.id,
            )
        ) is not None

    return {
        "id": post.id,
        "user_id": post.user_id,
        "content": post.content,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "author": {
            "id": post.author.id,
            "username": post.author.username,
        },
        "likes_count": likes_count,
        "comments_count": comments_count,
        "liked_by_me": liked_by_me,
    }


def serialize_post_comment(comment: PostComment) -> dict:
    return {
        "id": comment.id,
        "user_id": comment.user_id,
        "username": comment.author.username,
        "content": comment.content,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
    }


# ============================================================
# CREATE POST
# ============================================================

@app.post(
    "/api/v1/posts",
    response_model=PostResponse,
    status_code=201,
)
def create_social_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = Post(
        user_id=current_user.id,
        content=data.content,
    )

    db.add(post)
    db.commit()
    db.refresh(post)

    return serialize_post(post, db, current_user)


# ============================================================
# LIST POSTS
# ============================================================

@app.get(
    "/api/v1/posts",
    response_model=list[PostResponse],
)
def list_social_posts(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    posts = db.scalars(
        select(Post)
        .options(selectinload(Post.author))
        .order_by(
            Post.created_at.desc(),
            Post.id.desc(),
        )
        .offset(offset)
        .limit(limit)
    ).all()

    return [
        serialize_post(post, db, current_user)
        for post in posts
    ]


# ============================================================
# GET SINGLE POST
# ============================================================

@app.get(
    "/api/v1/posts/{post_id}",
    response_model=PostResponse,
)
def get_social_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    post = get_existing_post(post_id, db)

    return serialize_post(post, db, current_user)


# ============================================================
# EDIT OWN POST
# ============================================================

@app.patch(
    "/api/v1/posts/{post_id}",
    response_model=PostResponse,
)
def update_social_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_owned_post(post_id, db, current_user)

    post.content = data.content
    post.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(post)

    return serialize_post(post, db, current_user)


# ============================================================
# DELETE OWN POST
# ============================================================

@app.delete(
    "/api/v1/posts/{post_id}",
    status_code=204,
)
def delete_social_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_owned_post(post_id, db, current_user)

    db.delete(post)
    db.commit()

    return Response(status_code=204)


# ============================================================
# LIKE POST
# ============================================================

@app.post(
    "/api/v1/posts/{post_id}/like",
    response_model=PostLikeResponse,
)
def like_social_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_existing_post(post_id, db)

    existing = db.scalar(
        select(PostLike).where(
            PostLike.post_id == post.id,
            PostLike.user_id == current_user.id,
        )
    )

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="You have already liked this post."
        )

    db.add(
        PostLike(
            post_id=post.id,
            user_id=current_user.id,
        )
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="You have already liked this post."
        )

    likes_count = db.scalar(
        select(func.count(PostLike.id)).where(
            PostLike.post_id == post.id
        )
    ) or 0

    return {
        "post_id": post.id,
        "likes_count": likes_count,
        "liked_by_me": True,
    }


# ============================================================
# UNLIKE POST
# ============================================================

@app.delete(
    "/api/v1/posts/{post_id}/like",
    response_model=PostLikeResponse,
)
def unlike_social_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_existing_post(post_id, db)

    existing = db.scalar(
        select(PostLike).where(
            PostLike.post_id == post.id,
            PostLike.user_id == current_user.id,
        )
    )

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="You have not liked this post."
        )

    db.delete(existing)
    db.commit()

    likes_count = db.scalar(
        select(func.count(PostLike.id)).where(
            PostLike.post_id == post.id
        )
    ) or 0

    return {
        "post_id": post.id,
        "likes_count": likes_count,
        "liked_by_me": False,
    }


# ============================================================
# LIST POST COMMENTS
# ============================================================

@app.get(
    "/api/v1/posts/{post_id}/comments",
    response_model=list[PostCommentResponse],
)
def list_social_post_comments(
    post_id: int,
    db: Session = Depends(get_db),
):
    get_existing_post(post_id, db)

    comments = db.scalars(
        select(PostComment)
        .options(selectinload(PostComment.author))
        .where(PostComment.post_id == post_id)
        .order_by(
            PostComment.created_at.asc(),
            PostComment.id.asc(),
        )
    ).all()

    return [
        serialize_post_comment(comment)
        for comment in comments
    ]


# ============================================================
# CREATE POST COMMENT
# ============================================================

@app.post(
    "/api/v1/posts/{post_id}/comments",
    response_model=PostCommentResponse,
    status_code=201,
)
def create_social_post_comment(
    post_id: int,
    data: PostCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_existing_post(post_id, db)

    comment = PostComment(
        post_id=post_id,
        user_id=current_user.id,
        content=data.content,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return serialize_post_comment(comment)


# ============================================================
# EDIT OWN COMMENT
# ============================================================

@app.patch(
    "/api/v1/posts/{post_id}/comments/{comment_id}",
    response_model=PostCommentResponse,
)
def update_social_post_comment(
    post_id: int,
    comment_id: int,
    data: PostCommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_existing_post(post_id, db)

    comment = db.scalar(
        select(PostComment).where(
            PostComment.id == comment_id,
            PostComment.post_id == post_id,
        )
    )

    if comment is None:
        raise HTTPException(
            status_code=404,
            detail="Comment not found."
        )

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only edit your own comments."
        )

    comment.content = data.content
    comment.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(comment)

    return serialize_post_comment(comment)


# ============================================================
# DELETE OWN COMMENT
# ============================================================

@app.delete(
    "/api/v1/posts/{post_id}/comments/{comment_id}",
    status_code=204,
)
def delete_social_post_comment(
    post_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_existing_post(post_id, db)

    comment = db.scalar(
        select(PostComment).where(
            PostComment.id == comment_id,
            PostComment.post_id == post_id,
        )
    )

    if comment is None:
        raise HTTPException(
            status_code=404,
            detail="Comment not found."
        )

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own comments."
        )

    db.delete(comment)
    db.commit()

    return Response(status_code=204)


# ============================================================
# SCENES — UNIFIED POST ROOM FEED
# ============================================================

@app.get("/api/v1/feed")
def get_unified_feed(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """
    Unified feed containing:
      - Standalone social posts
      - Public study decks

    Ordered newest-first with database-level pagination.
    """

    # --------------------------------------------------------
    # 1. Combine post and deck identifiers
    # --------------------------------------------------------

    post_entries = select(
        literal("post").label("type"),
        Post.id.label("id"),
        Post.created_at.label("created_at"),
    )

    deck_entries = select(
        literal("deck").label("type"),
        Deck.id.label("id"),
        Deck.created_at.label("created_at"),
    ).where(
        Deck.is_public.is_(True)
    )

    combined = union_all(
        post_entries,
        deck_entries,
    ).subquery()

    # --------------------------------------------------------
    # 2. Count all eligible feed entries
    # --------------------------------------------------------

    total = db.scalar(
        select(func.count()).select_from(combined)
    ) or 0

    total_pages = (
        (total + page_size - 1) // page_size
        if total
        else 0
    )

    # --------------------------------------------------------
    # 3. Paginate the combined feed
    # --------------------------------------------------------

    offset = (page - 1) * page_size

    entries = db.execute(
        select(
            combined.c.type,
            combined.c.id,
            combined.c.created_at,
        )
        .order_by(
            combined.c.created_at.desc(),
            combined.c.type.asc(),
            combined.c.id.desc(),
        )
        .offset(offset)
        .limit(page_size)
    ).all()

    # --------------------------------------------------------
    # 4. Batch-fetch records for this page
    # --------------------------------------------------------

    post_ids = [
        entry.id
        for entry in entries
        if entry.type == "post"
    ]

    deck_ids = [
        entry.id
        for entry in entries
        if entry.type == "deck"
    ]

    posts = {
        post.id: post
        for post in db.scalars(
            select(Post).where(Post.id.in_(post_ids))
        ).all()
    } if post_ids else {}

    decks = {
        deck.id: deck
        for deck in db.scalars(
            select(Deck).where(
                Deck.id.in_(deck_ids),
                Deck.is_public.is_(True),
            )
        ).all()
    } if deck_ids else {}

    # --------------------------------------------------------
    # 5. Aggregate standalone-post interactions
    # --------------------------------------------------------

    post_like_counts = {}

    post_comment_counts = {}

    liked_post_ids = set()

    if post_ids:
        post_like_counts = dict(
            db.execute(
                select(
                    PostLike.post_id,
                    func.count(PostLike.id),
                )
                .where(PostLike.post_id.in_(post_ids))
                .group_by(PostLike.post_id)
            ).all()
        )

        post_comment_counts = dict(
            db.execute(
                select(
                    PostComment.post_id,
                    func.count(PostComment.id),
                )
                .where(PostComment.post_id.in_(post_ids))
                .group_by(PostComment.post_id)
            ).all()
        )

        if current_user is not None:
            liked_post_ids = set(
                db.scalars(
                    select(PostLike.post_id).where(
                        PostLike.post_id.in_(post_ids),
                        PostLike.user_id == current_user.id,
                    )
                ).all()
            )

    # --------------------------------------------------------
    # 6. Aggregate study-deck interactions
    # --------------------------------------------------------

    deck_like_counts = {}

    deck_comment_counts = {}

    liked_deck_ids = set()

    if deck_ids:
        deck_like_counts = dict(
            db.execute(
                select(
                    DeckSocial.deck_id,
                    func.count(DeckLike.id),
                )
                .join(
                    DeckLike,
                    DeckLike.social_id == DeckSocial.id,
                )
                .where(DeckSocial.deck_id.in_(deck_ids))
                .group_by(DeckSocial.deck_id)
            ).all()
        )

        deck_comment_counts = dict(
            db.execute(
                select(
                    DeckSocial.deck_id,
                    func.count(DeckComment.id),
                )
                .join(
                    DeckComment,
                    DeckComment.social_id == DeckSocial.id,
                )
                .where(DeckSocial.deck_id.in_(deck_ids))
                .group_by(DeckSocial.deck_id)
            ).all()
        )

        if current_user is not None:
            liked_deck_ids = set(
                db.scalars(
                    select(DeckSocial.deck_id)
                    .join(
                        DeckLike,
                        DeckLike.social_id == DeckSocial.id,
                    )
                    .where(
                        DeckSocial.deck_id.in_(deck_ids),
                        DeckLike.user_id == current_user.id,
                    )
                ).all()
            )

    # --------------------------------------------------------
    # 7. Build consistent feed items
    # --------------------------------------------------------

    items = []

    for entry in entries:

        if entry.type == "post":
            post = posts.get(entry.id)

            if post is None:
                continue

            items.append({
                "type": "post",
                "id": post.id,
                "content": post.content,
                "created_at": post.created_at,
                "updated_at": post.updated_at,
                "author": {
                    "id": post.author.id,
                    "username": post.author.username,
                },
                "likes_count": post_like_counts.get(
                    post.id, 0
                ),
                "comments_count": post_comment_counts.get(
                    post.id, 0
                ),
                "liked_by_me": (
                    post.id in liked_post_ids
                ),
            })

        elif entry.type == "deck":
            deck = decks.get(entry.id)

            if deck is None:
                continue

            items.append({
                "type": "deck",
                "id": deck.id,
                "name": deck.name,
                "description": deck.description,
                "created_at": deck.created_at,
                "author": {
                    "id": deck.owner.id,
                    "username": deck.owner.username,
                },
                "likes_count": deck_like_counts.get(
                    deck.id, 0
                ),
                "comments_count": deck_comment_counts.get(
                    deck.id, 0
                ),
                "liked_by_me": (
                    deck.id in liked_deck_ids
                ),
            })

    # --------------------------------------------------------
    # 8. Return paginated response
    # --------------------------------------------------------

    return {
        "items": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
        },
    }
