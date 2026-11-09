
import { apiRequest } from "./client";

// ============================================
// TYPES
// ============================================

export type Flashcard = {
  id: number;
  question: string;
  answer: string;
};

export type DeckSummary = {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
};

export type DeckDetail = DeckSummary & {
  flashcards: Flashcard[];
};

export type PublicDeck = DeckSummary & {
  owner: {
    id: number;
    username: string;
  } | null;
};

export type DeckCreate = {
  name: string;
  description?: string | null;
  is_public?: boolean;
};

export type DeckUpdate = {
  name?: string;
  description?: string | null;
  is_public?: boolean;
};

export type FlashcardCreate = {
  question: string;
  answer: string;
};

export type FlashcardUpdate = {
  question?: string;
  answer?: string;
};

export type GeneratedFlashcardsResponse = {
  filename: string | null;
  flashcards: FlashcardCreate[];
};

export type BatchCreateResponse = {
  deck_id: number;
  created_count: number;
  flashcards: Flashcard[];
};

export type FlashcardWithDeckId = Flashcard & {
  deck_id: number;
};

// ============================================
// READ DECKS
// ============================================

// GET /api/v1/decks
export function getMyDecks(): Promise<DeckSummary[]> {
  return apiRequest("/api/v1/decks");
}

// GET /api/v1/decks/{deck_id}
export function getDeck(
  deckId: number
): Promise<DeckDetail> {
  return apiRequest(`/api/v1/decks/${deckId}`);
}

// GET /api/v1/decks/public
export function getPublicDecks(
  query?: string
): Promise<PublicDeck[]> {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set("q", query.trim());
  }

  const suffix = params.toString();

  return apiRequest(
    `/api/v1/decks/public${suffix ? `?${suffix}` : ""}`
  );
}

// GET /api/v1/users/{user_id}/study-sets
export function getUserStudySets(
  userId: number
): Promise<DeckSummary[]> {
  return apiRequest(`/api/v1/users/${userId}/study-sets`);
}

// ============================================
// CREATE DECKS
// ============================================

// POST /api/v1/decks
export function createDeck(
  data: DeckCreate
): Promise<DeckSummary> {
  return apiRequest("/api/v1/decks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// POST /api/v1/decks/with-flashcards
export function createDeckWithFlashcards(
  data: DeckCreate & {
    flashcards: FlashcardCreate[];
  }
): Promise<DeckDetail> {
  return apiRequest("/api/v1/decks/with-flashcards", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ============================================
// AI FLASHCARD GENERATION
// ============================================

// POST /api/v1/flashcards/generate
// Generates flashcards without saving a deck.
export function generateFlashcards(
  file: File,
  count = 10
): Promise<GeneratedFlashcardsResponse> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("count", String(count));

  return apiRequest("/api/v1/flashcards/generate", {
    method: "POST",
    body: formData,
  });
}

// POST /api/v1/decks/generate
// Generates flashcards AND saves them as a private deck.
export function generateAndSaveDeck(
  file: File,
  name: string,
  options: {
    description?: string;
    count?: number;
  } = {}
): Promise<DeckDetail> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("name", name);
  formData.append("count", String(options.count ?? 10));

  if (options.description !== undefined) {
    formData.append("description", options.description);
  }

  return apiRequest("/api/v1/decks/generate", {
    method: "POST",
    body: formData,
  });
}

// ============================================
// UPDATE AND DELETE DECKS
// ============================================

// PATCH /api/v1/decks/{deck_id}
export function updateDeck(
  deckId: number,
  data: DeckUpdate
): Promise<DeckSummary> {
  return apiRequest(`/api/v1/decks/${deckId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// DELETE /api/v1/decks/{deck_id}
export function deleteDeck(deckId: number): Promise<void> {
  return apiRequest(`/api/v1/decks/${deckId}`, {
    method: "DELETE",
  });
}

// ============================================
// CREATE FLASHCARDS
// ============================================

// POST /api/v1/decks/{deck_id}/flashcards
export function createFlashcard(
  deckId: number,
  data: FlashcardCreate
): Promise<FlashcardWithDeckId> {
  return apiRequest(`/api/v1/decks/${deckId}/flashcards`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// POST /api/v1/decks/{deck_id}/flashcards/batch
export function createFlashcardsBatch(
  deckId: number,
  flashcards: FlashcardCreate[]
): Promise<BatchCreateResponse> {
  return apiRequest(
    `/api/v1/decks/${deckId}/flashcards/batch`,
    {
      method: "POST",
      body: JSON.stringify({ flashcards }),
    }
  );
}

// ============================================
// UPDATE FLASHCARDS
// ============================================

// PATCH /api/v1/decks/{deck_id}/flashcards/{flashcard_id}
export function updateFlashcard(
  deckId: number,
  flashcardId: number,
  data: FlashcardUpdate
): Promise<FlashcardWithDeckId> {
  return apiRequest(
    `/api/v1/decks/${deckId}/flashcards/${flashcardId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

// ============================================
// DELETE FLASHCARDS
// ============================================

// DELETE /api/v1/decks/{deck_id}/flashcards/{flashcard_id}
export function deleteFlashcard(
  deckId: number,
  flashcardId: number
): Promise<{ message: string }> {
  return apiRequest(
    `/api/v1/decks/${deckId}/flashcards/${flashcardId}`,
    {
      method: "DELETE",
    }
  );
}
