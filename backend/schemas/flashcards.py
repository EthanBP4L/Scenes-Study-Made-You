
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
