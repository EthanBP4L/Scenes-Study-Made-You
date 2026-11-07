from pydantic import BaseModel, Field


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
