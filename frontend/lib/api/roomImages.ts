
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

export type RoomImageUploadResponse = {
  user_id: number;
  username: string;
  bio: string | null;
  profile_picture: string | null;
  room_pictures: string[];
};

export class RoomImageUploadError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "RoomImageUploadError";
  }
}

export async function uploadRoomImage(
  file: File
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE}/api/v1/users/me/profile/room-pictures`,
    {
      method: "POST",
      credentials: "include",
      body: formData,
    }
  );

  if (!response.ok) {
    let message = `Upload failed (${response.status})`;

    try {
      const data = await response.json();

      if (typeof data.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep the default error message.
    }

    throw new RoomImageUploadError(
      response.status,
      message
    );
  }

  const data: RoomImageUploadResponse =
    await response.json();

  const uploadedPath =
    data.room_pictures.at(-1);

  if (!uploadedPath) {
    throw new Error(
      "Upload succeeded, but no image path was returned."
    );
  }

  return uploadedPath;
}

export function getRoomImageUrl(
  path: string
): string {
  if (
    path.startsWith("/uploads/")
  ) {
    return `${API_BASE}${path}`;
  }

  return path;
}
