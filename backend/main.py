
from email.mime import text

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.pdf_service import extract_pdf_text
from services.gemini_service import generate_flashcards

from database import Base, engine
from models.flashcard_decks import Deck
from models.flashcards import Flashcard
from schemas.flashcards import FlashcardCreate

from fastapi import Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from schemas.flashcard_decks import DeckCreate

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






