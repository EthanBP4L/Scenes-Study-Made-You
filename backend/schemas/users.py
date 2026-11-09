
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class UserCreate(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9_]+$"
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128
    )


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr


class UserLogin(BaseModel):
    email: EmailStr
    password: str
