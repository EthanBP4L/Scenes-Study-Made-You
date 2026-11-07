
from email.mime import text
from security import hash_password, verify_password, generate_session_token, hash_session_token
from datetime import datetime, timedelta, timezone
import requests
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Response, Cookie
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

from schemas.rooms import RoomWriteRequest, RoomDocument
from schemas.flashcards import FlashcardCreate, FlashcardUpdate, FlashcardBatchCreate
from schemas.flashcard_decks import DeckCreate, DeckUpdate, DeckCreateWithFlashcards
from schemas.users import UserCreate, UserResponse, UserLogin
from schemas.profiles import ProfileResponse, ProfileUpdate

from sqlalchemy.orm import Session
from sqlalchemy import select, or_, update
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
    db: Session = Depends(get_db)
):
    query = select(Deck).where(
        Deck.is_public.is_(True)
    )

    if q is not None and q.strip():
        search_term = f"%{q.strip()}%"

        query = query.where(
            or_(
                Deck.name.ilike(search_term),
                Deck.description.ilike(search_term)
            )
        )

    query = query.order_by(
        Deck.created_at.desc()
    )

    decks = db.scalars(query).all()

    return [
        {
            "id": deck.id,
            "name": deck.name,
            "description": deck.description,
            "is_public": deck.is_public,
            "created_at": deck.created_at,
            "owner": {
                "id": deck.owner.id,
                "username": deck.owner.username
            } if deck.owner else None
        }
        for deck in decks
    ]



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

    # Validate references to existing uploaded images.
    profile = db.get(Profile, current_user.id)

    allowed_images = set(profile.room_pictures or []) if profile else set()

    if profile and profile.profile_picture:
        allowed_images.add(profile.profile_picture)

    media_references = [
        room_data.background.mediaUrl
    ]

    for obj in room_data.objects:
        media_references.append(obj.mediaUrl)

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

                deck = db.get(Deck, int(obj.dataSourceId))

                if deck is None or deck.owner_id != current_user.id:
                    raise HTTPException(
                        status_code=422,
                        detail="Study set must belong to the room owner."
                    )

    for media_url in media_references:
        if media_url is not None and media_url not in allowed_images:
            raise HTTPException(
                status_code=422,
                detail="Room references an unauthorized image."
            )

    now = datetime.now(timezone.utc)

    # Convert validated Pydantic objects to JSON-compatible data.
    background = room_data.background.model_dump(mode="json")
    objects = [
        obj.model_dump(mode="json")
        for obj in room_data.objects
    ]
    study_sets = room_data.studySets.model_dump(mode="json")

    if existing_room is None:
        if room_data.expectedRevision is not None:
            raise HTTPException(
                status_code=409,
                detail="Room does not exist. Expected revision must be null."
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
                detail="A room already exists for this user."
            )

        db.refresh(room)

    else:
        if room_data.expectedRevision is None:
            raise HTTPException(
                status_code=409,
                detail="Room already exists. Provide its current revision."
            )

        # Atomic revision check prevents simultaneous stale saves.
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
                detail="Room has changed. Reload before saving."
            )

        db.commit()

        room = db.scalar(
            select(Room).where(
                Room.owner_id == current_user.id
            )
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
