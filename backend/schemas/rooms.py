
from datetime import datetime
from typing import Literal
from math import isfinite

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class RoomSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Transform(RoomSchema):
    x: float = Field(ge=-10000, le=10000)
    y: float = Field(ge=-10000, le=10000)
    width: float = Field(ge=1, le=5000)
    height: float = Field(ge=1, le=5000)
    rotation: float = Field(ge=-360, le=360)
    zIndex: int = Field(ge=0, le=10000)

    @field_validator("x", "y", "width", "height", "rotation")
    @classmethod
    def finite_numbers(cls, value):
        if not isfinite(value):
            raise ValueError("Values must be finite.")
        return value


class Appearance(RoomSchema):
    opacity: float = Field(ge=0, le=1)
    backgroundColor: str = Field(max_length=100)
    borderColor: str = Field(max_length=100)
    borderWidth: float = Field(ge=0, le=100)
    borderRadius: float = Field(ge=0, le=1000)
    borderStyle: Literal["none", "solid", "dashed", "dotted"]
    boxShadow: str = Field(max_length=200)
    blur: float = Field(ge=0, le=100)
    color: str = Field(max_length=100)
    fontFamily: str = Field(max_length=150)
    fontSize: float = Field(ge=1, le=300)
    fontWeight: int = Field(ge=100, le=900)
    backgroundImage: str | None = Field(
    default=None,
    max_length=500
    )


class Animation(RoomSchema):
    type: Literal[
        "none", "float", "sway",
        "spin", "pulse", "bounce"
    ]
    duration: float = Field(ge=0, le=120)
    delay: float = Field(ge=0, le=120)
    intensity: float = Field(ge=0, le=10)
    infinite: bool


class RoomObject(RoomSchema):
    id: str = Field(min_length=1, max_length=100)
    type: Literal[
        "text", "image", "gif", "video",
        "shape", "sticker", "section",
        "study-sets", "decoration"
    ]
    name: str = Field(max_length=100)
    visible: bool
    locked: bool
    transform: Transform
    appearance: Appearance
    content: str | None = Field(default=None, max_length=20000)
    mediaUrl: str | None = Field(default=None, max_length=500)
    parentId: None = None
    dataSourceId: str | None = None
    animation: Animation


class Background(RoomSchema):
    type: Literal["color", "gradient", "image", "gif", "video"]
    color: str = Field(max_length=100)
    gradient: str | None = Field(default=None, max_length=500)
    mediaUrl: str | None = Field(default=None, max_length=500)


class StudySets(RoomSchema):
    mode: Literal["tray", "canvas", "both", "hidden"]
    trayIcon: str = Field(max_length=20)
    trayLabel: str = Field(max_length=100)
    trayObjectId: str | None = None


class RoomWriteRequest(RoomSchema):
    schemaVersion: Literal[1]
    expectedRevision: int | None = Field(default=None, ge=1)
    name: str = Field(min_length=1, max_length=100)
    visibility: Literal["private", "public"]
    published: bool
    background: Background
    objects: list[RoomObject] = Field(max_length=100)
    studySets: StudySets

    @model_validator(mode="after")
    def validate_unique_object_ids(self):
        ids = [obj.id for obj in self.objects]

        if len(ids) != len(set(ids)):
            raise ValueError("Room object IDs must be unique.")

        return self


class RoomDocument(RoomSchema):
    schemaVersion: Literal[1]
    id: str
    ownerId: int
    revision: int
    name: str
    visibility: Literal["private", "public"]
    published: bool
    background: Background
    objects: list[RoomObject]
    studySets: StudySets
    updatedAt: datetime
