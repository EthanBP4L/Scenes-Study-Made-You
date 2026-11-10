
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ZimmerCanvas from "../../components/ZimmerCanvas";
import RequireAuth from "../../components/RequireAuth";
import DeckManagerModal from "../../components/DeckManagerModal";
import {
  createDefaultZimmer,
  type ZimmerDraft,
} from "../../lib/zimmerTypes";
import {
  getMyDecks,
  getDeck,
  type DeckSummary,
  type DeckDetail,
} from "../../lib/api/decks";

const flashcardRoom: ZimmerDraft = {
  ...createDefaultZimmer(),
  name: "Flashcard Room",
  background: {
    type: "gradient",
    color: "#0b1025",
    gradient:
      "radial-gradient(ellipse at 65% 15%, #78528f 0%, #49315f 36%, #211832 72%, #0b1025 100%)",
    mediaUrl: null,
  },
  studySets: {
    mode: "hidden",
    trayIcon: "✧",
    trayLabel: "Flashcard Decks",
    trayObjectId: null,
  },
};

function FlashcardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedDeckParam = searchParams.get("deckId");

  const requestedDeckId =
    requestedDeckParam !== null &&
    /^\d+$/.test(requestedDeckParam) &&
    Number.isSafeInteger(Number(requestedDeckParam)) &&
    Number(requestedDeckParam) > 0
      ? Number(requestedDeckParam)
      : null;

  const invalidDeckLink =
    requestedDeckParam !== null &&
    requestedDeckId === null;

  const [decks, setDecks] = useState<DeckSummary[]>([]);

  const [selectedDeck, setSelectedDeck] =
    useState<DeckDetail | null>(null);

  const [selectedDeckId, setSelectedDeckId] =
    useState<number | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [loadingDecks, setLoadingDecks] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [managerOpen, setManagerOpen] = useState(false);
  const [editingDeckId, setEditingDeckId] =
    useState<number | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [cardsRefreshKey, setCardsRefreshKey] = useState(0);

  // ----------------------------------------------------------
  // Identify whether the selected deck belongs to this user.
  // The personal deck list comes from the authenticated API.
  // ----------------------------------------------------------

  const isOwnDeck =
    selectedDeckId !== null &&
    decks.some((deck) => deck.id === selectedDeckId);

  const isCommunityDeck =
    selectedDeck !== null &&
    !isOwnDeck &&
    !loadingDecks;

  // ----------------------------------------------------------
  // Load the user's personal decks.
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadDecks() {
      try {
        setLoadingDecks(true);
        setError(null);

        const results = await getMyDecks();

        if (cancelled) return;

        setDecks(results);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your decks."
        );
      } finally {
        if (!cancelled) {
          setLoadingDecks(false);
        }
      }
    }

    void loadDecks();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // ----------------------------------------------------------
  // Select a deck based on the URL or the user's deck list.
  //
  // A URL deck ID takes priority, even if the deck belongs
  // to another user.
  // ----------------------------------------------------------

  useEffect(() => {
    if (loadingDecks) return;

    if (invalidDeckLink) {
      setSelectedDeckId(null);
      return;
    }

    if (requestedDeckId !== null) {
      setSelectedDeckId(requestedDeckId);
      return;
    }

    setSelectedDeckId((previous) => {
      const stillExists = decks.some(
        (deck) => deck.id === previous
      );

      return stillExists
        ? previous
        : (decks[0]?.id ?? null);
    });
  }, [
    loadingDecks,
    decks,
    requestedDeckId,
    invalidDeckLink,
  ]);

  // ----------------------------------------------------------
  // Load flashcards for the selected deck.
  // Public decks belonging to other users are supported.
  // ----------------------------------------------------------

  useEffect(() => {
    if (loadingDecks) return;

    const deckId = selectedDeckId;

    if (deckId === null) {
      setSelectedDeck(null);
      setLoadingCards(false);
      setCurrentIndex(0);
      setFlipped(false);
      return;
    }

    let cancelled = false;

    async function loadSelectedDeck() {
      try {
        setLoadingCards(true);
        setError(null);
        setSelectedDeck(null);
        setCurrentIndex(0);
        setFlipped(false);

        const result = await getDeck(deckId!);

        if (cancelled) return;

        setSelectedDeck(result);
      } catch (err) {
        if (cancelled) return;

        setSelectedDeck(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this deck."
        );
      } finally {
        if (!cancelled) {
          setLoadingCards(false);
        }
      }
    }

    void loadSelectedDeck();

    return () => {
      cancelled = true;
    };
  }, [selectedDeckId, cardsRefreshKey, loadingDecks]);

  // ----------------------------------------------------------
  // Flashcard navigation
  // ----------------------------------------------------------

  const cards = selectedDeck?.flashcards ?? [];
  const currentCard = cards[currentIndex] ?? null;

  const progress =
    cards.length > 0
      ? ((currentIndex + 1) / cards.length) * 100
      : 0;

  function selectDeck(deckId: number) {
    if (deckId === selectedDeckId) return;

    setError(null);
    setSelectedDeckId(deckId);

    // Keep the URL synchronized with the selected deck.
    router.push(`/flashcards?deckId=${deckId}`);
  }

  function goToCard(index: number) {
    if (index < 0 || index >= cards.length) return;

    setFlipped(false);
    setCurrentIndex(index);
  }

  // ----------------------------------------------------------
  // Deck manager
  // ----------------------------------------------------------

  function openCreateDeck() {
    setEditingDeckId(null);
    setManagerOpen(true);
  }

  function openEditDeck() {
    if (selectedDeckId === null || !isOwnDeck) return;

    setEditingDeckId(selectedDeckId);
    setManagerOpen(true);
  }

  function closeDeckManager() {
    setManagerOpen(false);
    setEditingDeckId(null);
  }

  function handleDeckSaved(deckId?: number) {
    if (deckId !== undefined) {
      setSelectedDeckId(deckId);
      router.push(`/flashcards?deckId=${deckId}`);
    } else {
      setSelectedDeckId(null);
      setSelectedDeck(null);
      router.push("/flashcards");
    }

    setRefreshKey((previous) => previous + 1);
    setCardsRefreshKey((previous) => previous + 1);
  }

  function returnToMyDecks() {
    setError(null);
    setSelectedDeckId(null);
    setSelectedDeck(null);

    router.push("/flashcards");
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <RequireAuth>
      <div className="relative h-screen overflow-hidden bg-[#0b1025]">
        <ZimmerCanvas
          pageName="Flashcard Room"
          initialRoom={flashcardRoom}
          showNavigation={true}
        />

        <DeckManagerModal
          open={managerOpen}
          onClose={closeDeckManager}
          deckId={editingDeckId}
          onSaved={handleDeckSaved}
        />

        {/* Independent scrolling content layer */}
        <div className="pointer-events-none absolute inset-0 z-10 overflow-y-auto overscroll-contain">
          <div className="pointer-events-auto mx-auto max-w-[1200px] px-5 pb-20 pt-14 sm:px-12">
            <div className="mx-auto max-w-[950px]">

              {/* HEADER */}

              <header className="mb-10 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-pink-200/75">
                  LEARN · REMEMBER · GROW
                </p>

                <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl">
                  Flashcard{" "}
                  <span className="text-[#efb4e8]">
                    Room
                  </span>
                  <span className="ml-2 text-purple-200">
                    ✦
                  </span>
                </h1>

                <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-purple-100/65">
                  A little room for big ideas. Flip a card and
                  see what you remember.
                </p>
              </header>

              {/* MAIN LAYOUT */}

              <div className="grid gap-7 lg:grid-cols-[230px_1fr]">

                {/* DECK SIDEBAR */}

                <aside className="h-fit rounded-[28px] border border-purple-200/20 bg-white/[0.07] p-5 shadow-xl backdrop-blur-2xl">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">
                      Your Decks
                    </h2>

                    <span className="text-pink-200">
                      ✧
                    </span>
                  </div>

                  {loadingDecks ? (
                    <div className="rounded-2xl border border-purple-200/20 bg-white/10 p-4">
                      <p className="text-sm text-purple-100/60">
                        Loading your decks...
                      </p>
                    </div>
                  ) : decks.length > 0 ? (
                    <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                      {decks.map((deck) => {
                        const isSelected =
                          deck.id === selectedDeckId;

                        return (
                          <button
                            key={deck.id}
                            type="button"
                            onClick={() =>
                              selectDeck(deck.id)
                            }
                            aria-pressed={isSelected}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              isSelected
                                ? "border-pink-200/30 bg-pink-200/10"
                                : "border-purple-200/20 bg-white/5 hover:bg-white/10"
                            }`}
                          >
                            <p className="break-words text-sm font-semibold text-white">
                              {deck.name}
                            </p>

                            {deck.description && (
                              <p className="mt-2 break-words text-xs leading-5 text-purple-100/60">
                                {deck.description}
                              </p>
                            )}

                            <p className="mt-2 text-xs text-purple-100/50">
                              {deck.is_public
                                ? "Public deck"
                                : "Private deck"}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-purple-200/20 px-4 py-6 text-center">
                      <p className="text-xs leading-6 text-purple-100/60">
                        You don&apos;t have any saved decks yet.
                      </p>

                      <p className="mt-2 text-xs leading-6 text-purple-100/40">
                        Create a deck to start studying.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={openCreateDeck}
                    className="mt-5 w-full rounded-2xl border border-pink-200/30 bg-pink-200/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-200/20"
                  >
                    + New Deck
                  </button>
                </aside>

                {/* FLASHCARD WORKSPACE */}

                <section className="min-w-0 rounded-[32px] border border-purple-200/20 bg-white/[0.05] p-5 shadow-[0_25px_90px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8">

                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div className="min-w-0">

                      <p className="text-xs uppercase tracking-[0.2em] text-pink-200/65">
                        {isCommunityDeck
                          ? "COMMUNITY DECK"
                          : "CURRENT DECK"}
                      </p>

                      <h2 className="mt-2 break-words text-xl font-bold text-white">
                        {selectedDeck?.name ??
                          (loadingDecks || loadingCards
                            ? "Loading..."
                            : "No Deck Selected")}
                      </h2>

                      {isCommunityDeck && (
                        <p className="mt-2 text-xs text-purple-100/60">
                          Shared by the SCENES community ✦
                        </p>
                      )}

                      {/* Only owners can edit decks */}

                      {selectedDeck && isOwnDeck && (
                        <button
                          type="button"
                          onClick={openEditDeck}
                          className="mt-3 rounded-xl border border-purple-200/25 bg-white/10 px-4 py-2 text-xs font-semibold text-purple-100 transition hover:bg-white/20"
                        >
                          Edit Deck ✧
                        </button>
                      )}

                      {isCommunityDeck && (
                        <button
                          type="button"
                          onClick={returnToMyDecks}
                          className="mt-3 rounded-xl border border-purple-200/25 bg-white/10 px-4 py-2 text-xs font-semibold text-purple-100 transition hover:bg-white/20"
                        >
                          ← Back to My Decks
                        </button>
                      )}
                    </div>

                    <div className="shrink-0 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-purple-100">
                      {currentCard
                        ? `${currentIndex + 1} / ${cards.length}`
                        : `0 / ${cards.length}`}
                    </div>
                  </div>

                  {/* ERROR MESSAGE */}

                  {(error || invalidDeckLink) && (
                    <div
                      role="alert"
                      className="mb-6 rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100"
                    >
                      {invalidDeckLink
                        ? "Invalid deck link."
                        : error}
                    </div>
                  )}

                  {/* FLASHCARD DISPLAY */}

                  {loadingDecks || loadingCards ? (
                    <div className="flex h-[330px] items-center justify-center rounded-[32px] border border-white/20 bg-white/[0.08] text-center text-purple-100/70 sm:h-[370px]">
                      Loading flashcards...
                    </div>
                  ) : !currentCard ? (
                    <div className="flex h-[330px] flex-col items-center justify-center rounded-[32px] border border-white/20 bg-white/[0.08] px-8 text-center sm:h-[370px]">
                      <span className="mb-5 text-4xl text-pink-200">
                        ✧
                      </span>

                      <h3 className="text-xl font-semibold text-white">
                        {selectedDeck
                          ? "This deck is empty"
                          : "Your study space awaits"}
                      </h3>

                      <p className="mt-4 max-w-sm text-sm leading-7 text-purple-100/60">
                        {selectedDeck
                          ? "Add flashcards to this deck to start studying."
                          : "Choose a saved deck to begin your flashcard session."}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* 3D GLASS FLASHCARD */}

                      <div
                        className="mx-auto w-full max-w-[580px]"
                        style={{
                          perspective: "1200px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setFlipped((value) => !value)
                          }
                          aria-label={
                            flipped
                              ? "Show flashcard question"
                              : "Reveal flashcard answer"
                          }
                          className="block h-[330px] w-full cursor-pointer text-left sm:h-[370px]"
                        >
                          <div
                            className="relative h-full w-full transition-transform duration-700"
                            style={{
                              transformStyle: "preserve-3d",
                              transform: flipped
                                ? "rotateY(180deg)"
                                : "rotateY(0deg)",
                            }}
                          >
                            {/* FRONT */}

                            <div
                              className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[32px] border border-white/30 bg-white/[0.12] px-8 text-center shadow-[0_20px_80px_rgba(10,5,30,0.22)] backdrop-blur-2xl"
                              style={{
                                backfaceVisibility: "hidden",
                                WebkitBackfaceVisibility:
                                  "hidden",
                              }}
                            >
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-pink-200/15 blur-[55px]"
                              />

                              <p className="mb-8 text-xs font-bold uppercase tracking-[0.3em] text-pink-100/75">
                                QUESTION ✧
                              </p>

                              <h3 className="relative max-w-md break-words text-2xl font-semibold leading-relaxed text-white sm:text-3xl">
                                {currentCard.question}
                              </h3>

                              <p className="absolute bottom-8 text-xs tracking-widest text-purple-100/55">
                                TAP TO REVEAL
                              </p>
                            </div>

                            {/* BACK */}

                            <div
                              className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[32px] border border-pink-200/35 bg-[#a96fce]/[0.18] px-8 text-center shadow-[0_20px_80px_rgba(10,5,30,0.22)] backdrop-blur-2xl"
                              style={{
                                transform: "rotateY(180deg)",
                                backfaceVisibility: "hidden",
                                WebkitBackfaceVisibility:
                                  "hidden",
                              }}
                            >
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-purple-300/20 blur-[55px]"
                              />

                              <p className="mb-8 text-xs font-bold uppercase tracking-[0.3em] text-pink-100/75">
                                ANSWER ✦
                              </p>

                              <h3 className="relative max-w-md break-words text-xl font-medium leading-relaxed text-white sm:text-2xl">
                                {currentCard.answer}
                              </h3>

                              <p className="absolute bottom-8 text-xs tracking-widest text-purple-100/55">
                                TAP TO FLIP BACK
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* PROGRESS */}

                      <div className="mx-auto mt-7 max-w-[580px]">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#a875e8] to-[#efb4e8] transition-all duration-300"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* FLASHCARD CONTROLS */}

                      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            goToCard(currentIndex - 1)
                          }
                          disabled={currentIndex === 0}
                          className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          ← Previous
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setFlipped((value) => !value)
                          }
                          className="rounded-2xl border border-pink-200/30 bg-gradient-to-r from-[#8052b9]/70 to-[#b46cb3]/70 px-7 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:brightness-110"
                        >
                          Flip Card ✧
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            goToCard(currentIndex + 1)
                          }
                          disabled={
                            currentIndex === cards.length - 1
                          }
                          className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          Next →
                        </button>
                      </div>
                    </>
                  )}

                  <p className="mt-6 text-center text-xs text-purple-100/45">
                    {selectedDeck
                      ? `${cards.length} flashcard${
                          cards.length === 1 ? "" : "s"
                        } in this deck`
                      : "Your personal flashcard study space"}
                  </p>
                </section>
              </div>

              {/* FOOTER */}

              <footer className="mt-12 text-center text-xs tracking-[0.25em] text-purple-100/40">
                SCENES · study made you ✦
              </footer>
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0b1025] text-purple-100">
          Loading Flashcard Room ✦
        </div>
      }
    >
      <FlashcardsContent />
    </Suspense>
  );
}
