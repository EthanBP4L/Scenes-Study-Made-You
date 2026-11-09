from pydantic import BaseModel, ConfigDict, Field


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    bio: str | None
    profile_picture: str | None
    room_pictures: list[str]
    
class ProfileUpdate(BaseModel):
    bio: str | None = Field(
        default=None,
        max_length=500
    )

    room_pictures: list[str] | None = Field(
        default=None,
        max_length=30
    )