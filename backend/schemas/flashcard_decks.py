from pydantic import BaseModel, Field
from schemas.flashcards import FlashcardCreate

class DeckCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=150
    )

    description: str | None = Field(
        default=None,
        max_length=500
    )

    is_public: bool = False



class DeckUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150
    )
    description: str | None = Field(
        default=None,
        max_length=500
    )
    is_public: bool | None = None


class DeckCreateWithFlashcards(DeckCreate):
    flashcards: list[FlashcardCreate] = Field(
        min_length=1,
        max_length=50
    )

