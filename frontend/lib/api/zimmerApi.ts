
import type { ZimmerDraft } from "../zimmerTypes";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

export type ZimmerDocument = ZimmerDraft & {
  id: string;
  ownerId: number;
  revision: number;
  updatedAt: string;
};

export type ZimmerSaveRequest = ZimmerDraft & {
  expectedRevision: number | null;
};

export class ZimmerApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ZimmerApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();
      if (typeof data.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep the HTTP error message.
    }

    throw new ZimmerApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export const zimmerApi = {
  getMine(): Promise<ZimmerDocument> {
    return request<ZimmerDocument>("/api/v1/me/zimmer");
  },

save(
  room: ZimmerDraft,
  expectedRevision: number | null
): Promise<ZimmerDocument> {
  const {
    schemaVersion,
    name,
    visibility,
    published,
    background,
    objects,
    studySets,
  } = room;

  return request<ZimmerDocument>("/api/v1/me/zimmer", {
    method: "PUT",
    body: JSON.stringify({
      schemaVersion,
      expectedRevision,
      name,
      visibility,
      published,
      background,
      objects,
      studySets,
    }),
  });
},

  getPublic(zimmerId: string): Promise<ZimmerDocument> {
    return request<ZimmerDocument>(
      `/api/v1/zimmers/${encodeURIComponent(zimmerId)}`
    );
  },
};
