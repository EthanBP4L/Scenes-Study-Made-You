from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class CommentCreate(BaseModel):
    content: str = Field(
        min_length=1,
        max_length=2000
    )


class CommentUpdate(BaseModel):
    content: str = Field(
        min_length=1,
        max_length=2000
    )


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    username: str
    content: str
    created_at: datetime
    updated_at: datetime | None = None


class DeckSocialResponse(BaseModel):
    deck_id: int
    likes_count: int
    comments_count: int
    liked_by_me: bool