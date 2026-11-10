
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PostCreate(BaseModel):
    content: str = Field(min_length=1, max_length=1000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Post content cannot be empty.")

        return value


class PostUpdate(PostCreate):
    pass


class PostAuthorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str


class PostResponse(BaseModel):
    id: int
    user_id: int
    content: str
    created_at: datetime
    updated_at: datetime | None = None
    author: PostAuthorResponse
    likes_count: int
    comments_count: int
    liked_by_me: bool


class PostCommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Comment cannot be empty.")

        return value


class PostCommentUpdate(PostCommentCreate):
    pass


class PostCommentResponse(BaseModel):
    id: int
    user_id: int
    username: str
    content: str
    created_at: datetime
    updated_at: datetime | None = None


class PostLikeResponse(BaseModel):
    post_id: int
    likes_count: int
    liked_by_me: bool
