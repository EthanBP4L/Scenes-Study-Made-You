
"use client";

import { useEffect, useRef, useState } from "react";
import {
  createDeckWithFlashcards,
  generateAndSaveDeck,
  updateDeck,
  deleteDeck,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  getDeck,
  type DeckDetail,
  type FlashcardCreate,
} from "../lib/api/decks";

type Props = {
  open: boolean;
  onClose: () => void;
  deckId?: number | null;
  onSaved: (deckId?: number) => void;
};

type EditorCard = {
  id?: number;
  question: string;
  answer: string;
};

type Mode = "manual" | "ai";

export default function DeckManagerModal({
  open,
  onClose,
  deckId = null,
  onSaved,
}: Props) {
  const [mode, setMode] = useState<Mode>("manual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [cards, setCards] = useState<EditorCard[]>([
    { question: "", answer: "" },
  ]);
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(10);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedDeck = useRef<DeckDetail | null>(null);

  const isEditing = deckId !== null;

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    setError(null);
    setMode("manual");
    setFile(null);
    setCount(10);
    setName("");
    setDescription("");
    setIsPublic(false);
    setCards([{ question: "", answer: "" }]);
    loadedDeck.current = null;

    if (deckId === null) return;

    async function load() {
      setLoading(true);

      try {
        const result = await getDeck(deckId!);

        if (cancelled) return;

        loadedDeck.current = result;
        setName(result.name);
        setDescription(result.description ?? "");
        setIsPublic(result.is_public);
        setCards(
          result.flashcards.map((card) => ({
            id: card.id,
            question: card.question,
            answer: card.answer,
          }))
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load deck."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, deckId]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving && !deleting) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving, deleting, onClose]);

  function changeCard(
    index: number,
    field: "question" | "answer",
    value: string
  ) {
    setCards((previous) =>
      previous.map((card, i) =>
        i === index ? { ...card, [field]: value } : card
      )
    );
  }

  function addCard() {
    setCards((previous) => [
      ...previous,
      { question: "", answer: "" },
    ]);
  }

  function removeCard(index: number) {
    setCards((previous) =>
      previous.filter((_, i) => i !== index)
    );
  }

  function validateCards(): FlashcardCreate[] {
    const nonempty = cards.filter(
      (card) => card.question.trim() || card.answer.trim()
    );

    if (
      nonempty.some(
        (card) => !card.question.trim() || !card.answer.trim()
      )
    ) {
      throw new Error(
        "Every flashcard needs both a question and an answer."
      );
    }

    return nonempty.map((card) => ({
      question: card.question.trim(),
      answer: card.answer.trim(),
    }));
  }

  async function save() {
    if (saving || deleting) return;

    setError(null);

    if (!name.trim()) {
      setError("Please enter a deck name.");
      return;
    }

    setSaving(true);

    try {
      if (!isEditing && mode === "ai") {
        if (!file) {
          throw new Error("Please select a PDF file.");
        }

        if (
          file.type !== "application/pdf" &&
          !file.name.toLowerCase().endsWith(".pdf")
        ) {
          throw new Error("Please select a valid PDF.");
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error("PDF files must be 10 MB or smaller.");
        }

        if (!Number.isInteger(count) || count < 1 || count > 50) {
          throw new Error("Choose between 1 and 50 flashcards.");
        }

        const created = await generateAndSaveDeck(
          file,
          name.trim(),
          {
            description: description.trim(),
            count,
          }
        );

        if (isPublic) {
          await updateDeck(created.id, { is_public: true });
        }

        onSaved(created.id);
        onClose();
        return;
      }

      const validCards = validateCards();

      if (!isEditing) {
        const created = await createDeckWithFlashcards({
          name: name.trim(),
          description: description.trim(),
          is_public: isPublic,
          flashcards: validCards,
        });

        onSaved(created.id);
        onClose();
        return;
      }

      const original = loadedDeck.current;

      if (!original || deckId === null) {
        throw new Error("The deck has not finished loading.");
      }

      await updateDeck(deckId, {
        name: name.trim(),
        description: description.trim(),
        is_public: isPublic,
      });

      const originalById = new Map(
        original.flashcards.map((card) => [card.id, card])
      );

      const remainingIds = new Set(
        cards
          .filter((card) => card.id !== undefined)
          .map((card) => card.id!)
      );

      for (const originalCard of original.flashcards) {
        if (!remainingIds.has(originalCard.id)) {
          await deleteFlashcard(deckId, originalCard.id);
        }
      }

      for (const card of cards) {
        const question = card.question.trim();
        const answer = card.answer.trim();

        if (!question && !answer && card.id === undefined) {
          continue;
        }

        if (!question || !answer) {
          throw new Error(
            "Every flashcard needs both a question and an answer."
          );
        }

        if (card.id === undefined) {
          await createFlashcard(deckId, { question, answer });
          continue;
        }

        const oldCard = originalById.get(card.id);

        if (
          oldCard &&
          (oldCard.question !== question ||
            oldCard.answer !== answer)
        ) {
          await updateFlashcard(deckId, card.id, {
            question,
            answer,
          });
        }
      }

      onSaved(deckId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the deck."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeDeck() {
    if (deckId === null || deleting || saving) return;

    const confirmed = window.confirm(
      "Delete this entire deck? This cannot be undone."
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteDeck(deckId);
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete the deck."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#090516]/80 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving &&
          !deleting
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-manager-title"
        className="flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[32px] border border-purple-200/25 bg-[#211832] text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-pink-200/65">
              SCENES · DECK MANAGER
            </p>
            <h2
              id="deck-manager-title"
              className="mt-2 text-2xl font-bold"
            >
              {isEditing ? "Edit Deck" : "Create New Deck"} ✧
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
            aria-label="Close deck manager"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
          {loading ? (
            <p className="py-20 text-center text-purple-100/70">
              Loading deck...
            </p>
          ) : (
            <>
              {!isEditing && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      mode === "manual"
                        ? "border-pink-200/40 bg-pink-200/15"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    Manual Creation
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("ai")}
                    className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      mode === "ai"
                        ? "border-pink-200/40 bg-pink-200/15"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    AI from PDF ✦
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-purple-100/80">
                  Deck Name
                  <input
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    maxLength={150}
                    placeholder="e.g. Biology Chapter 4"
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-purple-100/35 focus:border-pink-200/50"
                  />
                </label>

                <label className="block text-sm font-semibold text-purple-100/80">
                  Description
                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    maxLength={500}
                    rows={2}
                    placeholder="What will you study?"
                    className="mt-2 w-full resize-y rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-purple-100/35 focus:border-pink-200/50"
                  />
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(event) =>
                      setIsPublic(event.target.checked)
                    }
                    className="h-4 w-4 accent-pink-300"
                  />
                  <span>
                    <span className="block text-sm font-semibold">
                      Public Deck
                    </span>
                    <span className="mt-1 block text-xs text-purple-100/55">
                      Allow other users to view and study this deck.
                    </span>
                  </span>
                </label>
              </div>

              {mode === "ai" && !isEditing ? (
                <div className="space-y-5 rounded-[24px] border border-pink-200/20 bg-pink-200/[0.06] p-5">
                  <div>
                    <h3 className="text-lg font-bold">
                      Generate with Gemini ✦
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-purple-100/60">
                      Upload a PDF and let AI turn its content into
                      a study deck.
                    </p>
                  </div>

                  <label className="block text-sm font-semibold text-purple-100/80">
                    PDF Document
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(event) =>
                        setFile(event.target.files?.[0] ?? null)
                      }
                      className="mt-3 block w-full text-sm text-purple-100/70 file:mr-4 file:rounded-xl file:border-0 file:bg-pink-200/20 file:px-4 file:py-2 file:font-semibold file:text-white"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-purple-100/80">
                    Number of Flashcards
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={count}
                      onChange={(event) =>
                        setCount(Number(event.target.value))
                      }
                      className="mt-2 w-28 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-pink-200/50"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">
                      Flashcards
                    </h3>
                    <span className="text-xs text-purple-100/50">
                      {cards.length} card(s)
                    </span>
                  </div>

                  {cards.map((card, index) => (
                    <div
                      key={card.id ?? `new-${index}`}
                      className="rounded-[24px] border border-white/15 bg-white/[0.06] p-5"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-widest text-pink-200/70">
                          Card {index + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeCard(index)}
                          className="text-xs text-red-200/70 transition hover:text-red-200"
                        >
                          Remove
                        </button>
                      </div>

                      <label className="block text-sm text-purple-100/80">
                        Question
                        <textarea
                          value={card.question}
                          onChange={(event) =>
                            changeCard(
                              index,
                              "question",
                              event.target.value
                            )
                          }
                          rows={2}
                          className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-pink-200/50"
                        />
                      </label>

                      <label className="mt-4 block text-sm text-purple-100/80">
                        Answer
                        <textarea
                          value={card.answer}
                          onChange={(event) =>
                            changeCard(
                              index,
                              "answer",
                              event.target.value
                            )
                          }
                          rows={2}
                          className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-pink-200/50"
                        />
                      </label>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addCard}
                    className="w-full rounded-2xl border border-dashed border-pink-200/30 bg-pink-200/[0.05] px-4 py-4 text-sm font-semibold text-pink-100 transition hover:bg-pink-200/10"
                  >
                    + Add Flashcard
                  </button>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100"
                >
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-5 sm:px-8">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={() => void removeDeck()}
                disabled={loading || saving || deleting}
                className="rounded-2xl border border-red-300/30 bg-red-300/10 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-300/20 disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Delete Deck"}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => void save()}
              disabled={loading || saving || deleting}
              className="rounded-2xl border border-pink-200/30 bg-gradient-to-r from-[#8052b9] to-[#b46cb3] px-6 py-3 text-sm font-bold transition hover:brightness-110 disabled:opacity-40"
            >
              {saving
                ? mode === "ai"
                  ? "Generating..."
                  : "Saving..."
                : isEditing
                  ? "Save Changes ✧"
                  : mode === "ai"
                    ? "Generate Deck ✦"
                    : "Create Deck ✧"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
