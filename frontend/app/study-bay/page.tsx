
"use client";

import RequireAuth from "../../components/RequireAuth";
import { useRef, useState } from "react";
import Link from "next/link";
import ZimmerCanvas from "../../components/ZimmerCanvas";
import {
  createDefaultZimmer,
  type ZimmerDraft,
} from "../../lib/zimmerTypes";

const studyBayRoom: ZimmerDraft = {
  ...createDefaultZimmer(),
  name: "Study Bay",
  background: {
    type: "gradient",
    color: "#0b1025",
    gradient:
      "radial-gradient(ellipse at 72% 18%, #6b4d8d 0%, #3a2959 38%, #18152f 72%, #0b1025 100%)",
    mediaUrl: null,
  },
  studySets: {
    mode: "hidden",
    trayIcon: "✧",
    trayLabel: "Study Materials",
    trayObjectId: null,
  },
};

export default function StudyBayPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  function chooseFiles(files: FileList | null) {
    if (!files) return;

    const pdfs = Array.from(files).filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
    );

    setSelectedFiles((current) => [...current, ...pdfs]);
  }

  function formatSize(bytes: number) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return (
    <RequireAuth>
    <div className="relative min-h-screen bg-[#0b1025]">
      <ZimmerCanvas
        pageName="Study Bay"
        initialRoom={studyBayRoom}
        showNavigation={true}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto max-w-[1200px] px-5 pb-16 pt-20 sm:px-12">
        <div className="pointer-events-auto mx-auto max-w-[950px]">
          <header className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-pink-200/75">
              SCENES · YOUR STUDY SPACE
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">
              Study <span className="text-[#efb4e8]">Bay</span>
              <span className="ml-3 text-3xl text-purple-200">
                ✧
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-purple-100/70">
              Your little corner of the universe for readings,
              documents, and everything you want to learn.
            </p>
          </header>

          <section
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              chooseFiles(event.dataTransfer.files);
            }}
            className={`rounded-[32px] border-2 border-dashed p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition sm:p-12 ${
              dragging
                ? "border-pink-300 bg-purple-300/20"
                : "border-purple-200/30 bg-white/[0.07]"
            }`}
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/20 bg-white/10 text-4xl text-pink-200">
              ⇧
            </div>

            <h2 className="mt-6 text-2xl font-bold text-white">
              Bring your notes aboard
            </h2>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-purple-100/65">
              Drop your PDFs here or select them from your device.
            </p>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(event) => {
                chooseFiles(event.target.files);
                event.target.value = "";
              }}
            />

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-7 rounded-2xl border border-pink-200/40 bg-gradient-to-r from-[#8552bf] to-[#c779bc] px-8 py-3.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
            >
              + Select PDFs
            </button>

            <p className="mt-4 text-xs text-purple-100/40">
              PDF documents · Ready for backend integration
            </p>
          </section>

          <section className="mt-7 rounded-[28px] border border-purple-200/20 bg-[#1b1431]/65 p-6 backdrop-blur-2xl sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Your Documents
                </h2>
                <p className="mt-1 text-xs text-purple-100/55">
                  Study materials selected in this session
                </p>
              </div>

              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-purple-100">
                {selectedFiles.length} selected
              </span>
            </div>

            {selectedFiles.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-10 text-center">
                <div className="text-3xl">☁</div>
                <p className="mt-3 font-medium text-purple-100">
                  Your document space is ready.
                </p>
                <p className="mt-2 text-xs text-purple-100/50">
                  Select a PDF above to begin.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-200/10 text-xs font-bold text-pink-200">
                      PDF
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {file.name}
                      </p>
                      <p className="mt-1 text-xs text-purple-100/50">
                        {formatSize(file.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles((current) =>
                          current.filter((_, i) => i !== index)
                        )
                      }
                      className="rounded-xl border border-white/15 px-3 py-2 text-xs text-purple-100/70 hover:bg-white/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-7 flex flex-col items-center justify-between gap-5 rounded-[28px] border border-pink-200/20 bg-gradient-to-r from-[#49316e]/75 to-[#5d386c]/65 p-7 backdrop-blur-2xl sm:flex-row">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-pink-200/70">
                NEXT DESTINATION
              </p>
              <h2 className="mt-2 text-xl font-bold text-white">
                Flashcard Room ✦
              </h2>
              <p className="mt-2 text-sm text-purple-100/65">
                Head to your separate space for decks and review.
              </p>
            </div>

            <Link
              href="/flashcards"
              className="shrink-0 rounded-2xl border border-white/25 bg-white/15 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/25"
            >
              Go to Flashcards →
            </Link>
          </section>
        </div>
      </div>
    </div>
    </RequireAuth>
  );
}
