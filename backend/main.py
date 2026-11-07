
from email.mime import text

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.pdf_service import extract_pdf_text
from services.gemini_service import generate_flashcards

from database import Base, engine
from models.flashcard_decks import Deck
from models.flashcards import Flashcard

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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





