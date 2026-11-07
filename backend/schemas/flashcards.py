
from pydantic import BaseModel, Field


class FlashcardCreate(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=2000
    )

    answer: str = Field(
        min_length=1,
        max_length=5000
    )


class FlashcardUpdate(BaseModel):
    question: str | None = Field(
        default=None,
        min_length=1,
        max_length=2000
    )

    answer: str | None = Field(
        default=None,
        min_length=1,
        max_length=5000
    )

class FlashcardBatchCreate(BaseModel):
    flashcards: list[FlashcardCreate] = Field(
        min_length=1,
        max_length=50
    )
