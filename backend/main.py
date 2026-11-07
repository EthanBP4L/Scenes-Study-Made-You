
from email.mime import text
from security import hash_password, verify_password, generate_session_token, hash_session_token
from datetime import datetime, timedelta, timezone
import requests
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Response
from fastapi.middleware.cors import CORSMiddleware

from services.pdf_service import extract_pdf_text
from services.gemini_service import generate_flashcards

from database import Base, engine, SessionLocal

from models.flashcard_decks import Deck
from models.flashcards import Flashcard
from models.users import User
from models.sessions import UserSession

from schemas.flashcards import FlashcardCreate, FlashcardUpdate, FlashcardBatchCreate
from schemas.flashcard_decks import DeckCreate, DeckUpdate, DeckCreateWithFlashcards
from schemas.users import UserCreate, UserResponse, UserLogin

from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

app = FastAPI()

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
    db: Session = Depends(get_db)
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
        is_public=False
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
    db: Session = Depends(get_db)
):
    new_deck = Deck(
        name=deck_data.name,
        description=deck_data.description,
        is_public=deck_data.is_public
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
def add_flashcard(
    deck_id: int,
    flashcard_data: FlashcardCreate,
    db: Session = Depends(get_db)
):
    # Verify that the deck exists.
    deck = db.get(Deck, deck_id)

    if deck is None:
        raise HTTPException(
            status_code=404,
            detail="Study deck not found."
        )

    # Create a new flashcard associated with the deck.
    new_flashcard = Flashcard(
        deck_id=deck.id,
        question=flashcard_data.question,
        answer=flashcard_data.answer
    )

    db.add(new_flashcard)

    try:
        db.commit()
        db.refresh(new_flashcard)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save the flashcard."
        )

    return {
        "id": new_flashcard.id,
        "deck_id": new_flashcard.deck_id,
        "question": new_flashcard.question,
        "answer": new_flashcard.answer
    }



@app.get("/api/v1/decks/{deck_id}")
def get_deck(
    deck_id: int,
    db: Session = Depends(get_db)
):
    # Find the requested deck.
    deck = db.get(Deck, deck_id)

    if deck is None:
        raise HTTPException(
            status_code=404,
            detail="Study deck not found."
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
def get_all_decks(
    db: Session = Depends(get_db)
):
    decks = db.scalars(
        select(Deck).order_by(Deck.created_at.desc(), Deck.id.desc())
    ).all()

    return [
        {
            "id": deck.id,
            "name": deck.name,
            "description": deck.description,
            "is_public": deck.is_public,
            "created_at": deck.created_at,
            "flashcard_count": len(deck.flashcards)
        }
        for deck in decks
    ]


@app.delete(
    "/api/v1/decks/{deck_id}/flashcards/{flashcard_id}",
    status_code=204
)
def delete_flashcard(
    deck_id: int,
    flashcard_id: int,
    db: Session = Depends(get_db)
):
    flashcard = db.get(Flashcard, flashcard_id)

    if flashcard is None or flashcard.deck_id != deck_id:
        raise HTTPException(
            status_code=404,
            detail="Flashcard not found in this deck."
        )

    try:
        db.delete(flashcard)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete the flashcard."
        )


@app.delete(
    "/api/v1/decks/{deck_id}",
    status_code=204
)
def delete_deck(
    deck_id: int,
    db: Session = Depends(get_db)
):
    deck = db.get(Deck, deck_id)

    if deck is None:
        raise HTTPException(
            status_code=404,
            detail="Study deck not found."
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
    db: Session = Depends(get_db)
):
    deck = db.get(Deck, deck_id)

    if deck is None:
        raise HTTPException(
            status_code=404,
            detail="Study deck not found."
        )

    deck.name = deck_data.name

    try:
        db.commit()
        db.refresh(deck)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update the study deck."
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
    db: Session = Depends(get_db)
):
    flashcard = db.get(Flashcard, flashcard_id)

    if flashcard is None or flashcard.deck_id != deck_id:
        raise HTTPException(
            status_code=404,
            detail="Flashcard not found in this deck."
        )

    updates = flashcard_data.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one field to update."
        )

    if any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Question and answer cannot be null."
        )

    for field, value in updates.items():
        setattr(flashcard, field, value)

    try:
        db.commit()
        db.refresh(flashcard)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update the flashcard."
        )

    return {
        "id": flashcard.id,
        "deck_id": flashcard.deck_id,
        "question": flashcard.question,
        "answer": flashcard.answer
    }


@app.post("/api/v1/decks/{deck_id}/flashcards/batch", status_code=201)
def add_flashcards_batch(
    deck_id: int,
    batch_data: FlashcardBatchCreate,
    db: Session = Depends(get_db)
):
    # Verify that the destination deck exists.
    deck = db.get(Deck, deck_id)

    if deck is None:
        raise HTTPException(
            status_code=404,
            detail="Study deck not found."
        )

    # Prepare all flashcards before saving.
    new_flashcards = [
        Flashcard(
            deck_id=deck.id,
            question=card.question,
            answer=card.answer
        )
        for card in batch_data.flashcards
    ]

    try:
        db.add_all(new_flashcards)
        db.commit()

        for card in new_flashcards:
            db.refresh(card)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save flashcards."
        )

    return {
        "deck_id": deck.id,
        "saved_count": len(new_flashcards),
        "flashcards": [
            {
                "id": card.id,
                "question": card.question,
                "answer": card.answer
            }
            for card in new_flashcards
        ]
    }


@app.post("/api/v1/decks/with-flashcards", status_code=201)
def create_deck_with_flashcards(
    deck_data: DeckCreateWithFlashcards,
    db: Session = Depends(get_db)
):
    new_deck = Deck(
        name=deck_data.name,
        description=deck_data.description,
        is_public=deck_data.is_public
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
    # Normalize usernames and email addresses.
    username = user_data.username.lower()
    email = str(user_data.email).lower()

    # Check whether the username is already taken.
    existing_username = db.scalar(
        select(User).where(User.username == username)
    )

    if existing_username:
        raise HTTPException(
            status_code=409,
            detail="Username is already taken."
        )

    # Check whether the email is already registered.
    existing_email = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_email:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered."
        )

    # Hash the password before storing it.
    new_user = User(
        username=username,
        email=email,
        hashed_password=hash_password(user_data.password)
    )

    try:
        db.add(new_user)
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




