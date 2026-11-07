from pathlib import Path
from io import BytesIO
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError


BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"

MAX_IMAGE_SIZE = 5 * 1024 * 1024

ALLOWED_FORMATS = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp"
}

Image.MAX_IMAGE_PIXELS = 20_000_000


async def save_image(
    file: UploadFile,
    category: str,
    user_id: int
) -> str:

    if category not in {"profiles", "rooms"}:
        raise ValueError("Invalid image category.")

    contents = await file.read(MAX_IMAGE_SIZE + 1)

    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image must be 5 MB or smaller."
        )

    try:
        with Image.open(BytesIO(contents)) as image:
            image.verify()

        with Image.open(BytesIO(contents)) as image:
            image_format = image.format

            if image_format not in ALLOWED_FORMATS:
                raise HTTPException(
                    status_code=415,
                    detail="Only JPEG, PNG, and WebP images are supported."
                )

            image.load()

            if image.width > 5000 or image.height > 5000:
                raise HTTPException(
                    status_code=413,
                    detail="Image dimensions are too large."
                )

            extension = ALLOWED_FORMATS[image_format]

            # Re-encode to avoid storing untrusted image metadata.
            output = BytesIO()

            if image_format == "JPEG":
                image.convert("RGB").save(
                    output,
                    format="JPEG",
                    quality=90
                )
            elif image_format == "PNG":
                image.save(output, format="PNG")
            else:
                image.save(output, format="WEBP", quality=90)

    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=415,
            detail="Invalid or unsupported image."
        )

    folder = UPLOAD_DIR / category / str(user_id)
    folder.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid4().hex}{extension}"
    destination = folder / filename

    destination.write_bytes(output.getvalue())

    return f"/uploads/{category}/{user_id}/{filename}"
