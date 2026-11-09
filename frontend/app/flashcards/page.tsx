
"use client";

import { useState } from "react";
import ZimmerCanvas from "../../components/ZimmerCanvas";
import RequireAuth from "../../components/RequireAuth";
import {
  createDefaultZimmer,
  type ZimmerDraft,
} from "../../lib/zimmerTypes";

type Flashcard = {
  id: string;
  front: string;
  back: string;
};

const previewCards: Flashcard[] = [
  {
    id: "preview-1",
    front: "What is active recall?",
    back: "Retrieving information from memory instead of simply rereading it.",
  },
  {
    id: "preview-2",
    front: "What is spaced repetition?",
    back: "Reviewing information at increasing intervals to improve retention.",
  },
  {
    id: "preview-3",
    front: "What is the Pomodoro technique?",
    back: "A study method that alternates focused work sessions with short breaks.",
  },
];

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

export default function FlashcardsPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const currentCard = previewCards[currentIndex];

  function goToCard(index: number) {
    if (index < 0 || index >= previewCards.length) return;

    setFlipped(false);
    setCurrentIndex(index);
  }

  return (
    <RequireAuth>
      <div className="relative min-h-screen bg-[#0b1025]">
        <ZimmerCanvas
          pageName="Flashcard Room"
          initialRoom={flashcardRoom}
          showNavigation={true}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto max-w-[1200px] px-5 pb-20 pt-14 sm:px-12">
          <div className="pointer-events-auto mx-auto max-w-[950px]">
            <header className="mb-10 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-pink-200/75">
                LEARN · REMEMBER · GROW
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl">
                Flashcard{" "}
                <span className="text-[#efb4e8]">Room</span>
                <span className="ml-2 text-purple-200">✦</span>
              </h1>

              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-purple-100/65">
                A little room for big ideas. Flip a card and
                see what you remember.
              </p>
            </header>

            <div className="grid gap-7 lg:grid-cols-[230px_1fr]">
              {/* Deck sidebar */}
              <aside className="h-fit rounded-[28px] border border-purple-200/20 bg-white/[0.07] p-5 shadow-xl backdrop-blur-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">
                    Your Decks
                  </h2>
                  <span className="text-pink-200">✧</span>
                </div>

                <div className="rounded-2xl border border-pink-200/30 bg-pink-200/10 p-4">
                  <p className="text-sm font-semibold text-white">
                    Preview Deck
                  </p>

                  <p className="mt-2 text-xs text-purple-100/60">
                    {previewCards.length} sample cards
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-dashed border-purple-200/20 px-4 py-6 text-center">
                  <p className="text-xs leading-6 text-purple-100/50">
                    Your saved decks will appear here when
                    connected to your backend.
                  </p>
                </div>

                <button
                  type="button"
                  disabled
                  title="Awaiting backend integration"
                  className="mt-5 w-full cursor-not-allowed rounded-2xl border border-purple-200/20 bg-white/10 px-4 py-3 text-sm font-semibold text-purple-100/50"
                >
                  + New Deck
                </button>
              </aside>

              {/* Flashcard workspace */}
              <section className="rounded-[32px] border border-purple-200/20 bg-white/[0.05] p-5 shadow-[0_25px_90px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-pink-200/65">
                      CURRENT DECK
                    </p>

                    <h2 className="mt-2 text-xl font-bold text-white">
                      Preview Deck
                    </h2>
                  </div>

                  <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-purple-100">
                    {currentIndex + 1} / {previewCards.length}
                  </div>
                </div>

                {/* Glass flashcard */}
                <div
                  className="mx-auto w-full max-w-[580px]"
                  style={{ perspective: "1200px" }}
                >
                  <button
                    type="button"
                    onClick={() => setFlipped((value) => !value)}
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
                      {/* Front */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[32px] border border-white/30 bg-white/[0.12] px-8 text-center shadow-[0_20px_80px_rgba(10,5,30,0.22)] backdrop-blur-2xl"
                        style={{
                          backfaceVisibility: "hidden",
                          WebkitBackfaceVisibility: "hidden",
                        }}
                      >
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-pink-200/15 blur-[55px]"
                        />

                        <p className="mb-8 text-xs font-bold uppercase tracking-[0.3em] text-pink-100/75">
                          QUESTION ✧
                        </p>

                        <h3 className="relative max-w-md text-2xl font-semibold leading-relaxed text-white sm:text-3xl">
                          {currentCard.front}
                        </h3>

                        <p className="absolute bottom-8 text-xs tracking-widest text-purple-100/55">
                          TAP TO REVEAL
                        </p>
                      </div>

                      {/* Back */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[32px] border border-pink-200/35 bg-[#a96fce]/[0.18] px-8 text-center shadow-[0_20px_80px_rgba(10,5,30,0.22)] backdrop-blur-2xl"
                        style={{
                          transform: "rotateY(180deg)",
                          backfaceVisibility: "hidden",
                          WebkitBackfaceVisibility: "hidden",
                        }}
                      >
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-purple-300/20 blur-[55px]"
                        />

                        <p className="mb-8 text-xs font-bold uppercase tracking-[0.3em] text-pink-100/75">
                          ANSWER ✦
                        </p>

                        <h3 className="relative max-w-md text-xl font-medium leading-relaxed text-white sm:text-2xl">
                          {currentCard.back}
                        </h3>

                        <p className="absolute bottom-8 text-xs tracking-widest text-purple-100/55">
                          TAP TO FLIP BACK
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Progress */}
                <div className="mx-auto mt-7 max-w-[580px]">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#a875e8] to-[#efb4e8] transition-all duration-300"
                      style={{
                        width: `${
                          ((currentIndex + 1) /
                            previewCards.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Flashcard controls */}
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => goToCard(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ← Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => setFlipped((value) => !value)}
                    className="rounded-2xl border border-pink-200/30 bg-gradient-to-r from-[#8052b9]/70 to-[#b46cb3]/70 px-7 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:brightness-110"
                  >
                    Flip Card ✧
                  </button>

                  <button
                    type="button"
                    onClick={() => goToCard(currentIndex + 1)}
                    disabled={
                      currentIndex === previewCards.length - 1
                    }
                    className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Next →
                  </button>
                </div>

                <p className="mt-6 text-center text-xs text-purple-100/45">
                  Sample cards for frontend layout preview
                </p>
              </section>
            </div>

            <footer className="mt-12 text-center text-xs tracking-[0.25em] text-purple-100/40">
              SCENES · study made you ✦
            </footer>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
