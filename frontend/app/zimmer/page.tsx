
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RoomFeature = "about" | "sets" | "welcome";

type ZimmerSettings = {
  features: RoomFeature[];
  setsInTray: boolean;
};

const STORAGE_KEY = "scenes-zimmer-v1";

const defaults: ZimmerSettings = {
  features: ["welcome", "about"],
  setsInTray: true,
};

const featureNames: Record<RoomFeature, string> = {
  welcome: "Welcome message",
  about: "About Me",
  sets: "Study sets",
};

const studySets = [
  { id: "1", title: "My First Study Set", count: 12 },
  { id: "2", title: "Things I'm Learning", count: 24 },
];

export default function ZimmerPage() {
  const [settings, setSettings] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ZimmerSettings>;

        setSettings({
          features: Array.isArray(parsed.features)
            ? parsed.features.filter(
                (item): item is RoomFeature =>
                  item === "welcome" ||
                  item === "about" ||
                  item === "sets"
              )
            : defaults.features,
          setsInTray:
            typeof parsed.setsInTray === "boolean"
              ? parsed.setsInTray
              : defaults.setsInTray,
        });
      }
    } catch {
      console.warn("Zimmer settings could not be loaded.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      console.warn("Zimmer settings could not be saved.");
    }
  }, [settings, loaded]);

  function toggleFeature(feature: RoomFeature) {
    setSettings((current) => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features.filter((item) => item !== feature)
        : [...current.features, feature],
    }));
  }

  function toggleSetsLocation() {
    setSettings((current) => ({
      ...current,
      setsInTray: !current.setsInTray,
      features: current.features.filter((item) => item !== "sets"),
    }));
    setTrayOpen(false);
  }

  const showSetsOnPage =
    !settings.setsInTray && settings.features.includes("sets");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080817] text-white">
      {/* Dreamlike room atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#34245d_0%,#13102e_48%,#080817_100%)]" />

        <div className="absolute -left-32 top-20 h-[450px] w-[450px] rounded-full bg-fuchsia-500/20 blur-[110px]" />

        <div className="absolute -right-28 top-1/3 h-[500px] w-[500px] rounded-full bg-cyan-400/15 blur-[120px]" />

        <div className="absolute left-1/3 top-1/2 h-72 w-72 rounded-full bg-pink-300/10 blur-[90px]" />

        <div className="absolute left-[10%] top-[24%] h-2 w-2 rounded-full bg-white/80 shadow-[0_0_24px_white]" />
        <div className="absolute right-[19%] top-[15%] h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_20px_cyan]" />
        <div className="absolute right-[30%] top-[65%] h-2 w-2 rounded-full bg-pink-200 shadow-[0_0_20px_pink]" />
      </div>

      {/* Top controls */}
      <header className="relative z-30 flex items-center justify-between gap-3 px-5 py-6 sm:px-10">
        <Link
          href="/"
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm backdrop-blur-xl transition hover:bg-white/20"
        >
          ← SCENES
        </Link>

        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="rounded-full border border-white/25 bg-white/10 px-5 py-2 text-sm backdrop-blur-xl transition hover:bg-white/20"
        >
          💧 {editing ? "Done" : "Edit Zimmer"}
        </button>
      </header>

      {/* Freeform-inspired stage */}
      <div className="relative z-10 mx-auto flex min-h-[75vh] max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-8 left-[12%] text-6xl opacity-60 sm:text-8xl"
        >
          ✦
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-24 right-[8%] text-6xl opacity-50 sm:text-9xl"
        >
          ✧
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-20 left-[8%] text-5xl opacity-40"
        >
          ✳
        </div>

        <div className="relative mb-10 flex h-28 w-28 items-center justify-center rounded-full border border-white/40 bg-gradient-to-br from-white/40 via-fuchsia-300/20 to-cyan-200/30 text-5xl shadow-[0_0_80px_rgba(205,160,255,0.3)] backdrop-blur-xl">
          🪐
        </div>

        <p className="mb-5 text-xs font-semibold tracking-[0.5em] text-pink-200/80 uppercase">
          A little universe of my own
        </p>

        <h1 className="max-w-full bg-gradient-to-b from-white via-[#f2d8ff] to-[#8b91d4] bg-clip-text text-6xl font-black tracking-[-0.08em] text-transparent drop-shadow-2xl sm:text-8xl lg:text-9xl">
          MY ZIMMER
        </h1>

        {settings.features.includes("welcome") && (
          <div className="relative mt-10 max-w-xl">
            <p className="text-lg leading-8 font-light text-white/75 sm:text-xl">
              Welcome to my corner of the universe.
              Stay a little. Explore something beautiful.
            </p>

            {editing && (
              <button
                onClick={() => toggleFeature("welcome")}
                className="mt-3 text-xs text-pink-200 underline"
              >
                Remove welcome message
              </button>
            )}
          </div>
        )}

        {settings.features.includes("about") && (
          <div className="relative mt-16 w-full max-w-md rounded-[38px] border border-white/25 bg-gradient-to-br from-white/15 via-purple-200/5 to-transparent p-8 shadow-[0_20px_80px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
            <div className="mb-3 text-3xl">♡</div>
            <h2 className="mb-3 text-xl font-semibold">
              About Me
            </h2>
            <p className="leading-7 text-white/60">
              A place for my story, my favorite things,
              and whatever makes me, me.
            </p>

            {editing && (
              <button
                onClick={() => toggleFeature("about")}
                className="mt-4 text-xs text-pink-200 underline"
              >
                Remove About Me
              </button>
            )}
          </div>
        )}

        {showSetsOnPage && (
          <section className="mt-16 w-full max-w-lg">
            <h2 className="mb-5 text-2xl font-bold">
              My Study Sets
            </h2>

            <div className="grid gap-3">
              {studySets.map((set) => (
                <div
                  key={set.id}
                  className="rounded-2xl border border-white/20 bg-white/10 p-5 text-left backdrop-blur-xl"
                >
                  <p className="font-semibold">{set.title}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {set.count} cards · Demo data
                  </p>
                </div>
              ))}
            </div>

            {editing && (
              <button
                onClick={() => toggleFeature("sets")}
                className="mt-4 text-xs text-pink-200 underline"
              >
                Hide study sets from room
              </button>
            )}
          </section>
        )}
      </div>

      {/* Feature library */}
      {editing && (
        <aside className="fixed right-4 top-20 z-40 max-h-[65vh] w-[min(300px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-white/25 bg-[#17142c]/95 p-5 shadow-2xl backdrop-blur-2xl">
          <h2 className="mb-2 text-lg font-bold">
            Room Features
          </h2>
          <p className="mb-5 text-xs leading-5 text-white/55">
            Add or remove optional features.
            More objects and styling controls are coming.
          </p>

          <div className="space-y-3">
            {(
              ["welcome", "about", "sets"] as RoomFeature[]
            ).map((feature) => (
              <label
                key={feature}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3 text-sm"
              >
                {featureNames[feature]}

                <input
                  type="checkbox"
                  checked={
                    feature === "sets"
                      ? showSetsOnPage
                      : settings.features.includes(feature)
                  }
                  disabled={
                    feature === "sets" && settings.setsInTray
                  }
                  onChange={() => toggleFeature(feature)}
                  className="h-4 w-4 accent-fuchsia-400"
                />
              </label>
            ))}
          </div>

          <div className="mt-5 border-t border-white/15 pt-5">
            <p className="mb-3 text-sm font-semibold">
              Study set location
            </p>

            <button
              onClick={toggleSetsLocation}
              className="w-full rounded-xl border border-white/20 bg-white/10 p-3 text-left text-sm hover:bg-white/15"
            >
              {settings.setsInTray
                ? "Currently: Bottom tray"
                : "Currently: Room canvas"}
              <span className="mt-1 block text-xs text-white/50">
                Click to switch location
              </span>
            </button>
          </div>
        </aside>
      )}

      {/* Bottom study-set tray */}
      {settings.setsInTray && (
        <div className="fixed inset-x-0 bottom-5 z-30 flex flex-col items-center px-4">
          {trayOpen && (
            <div className="mb-3 w-full max-w-md rounded-[28px] border border-white/25 bg-[#1b1737]/95 p-5 shadow-2xl backdrop-blur-2xl">
              <h2 className="mb-4 text-center text-lg font-bold">
                My Study Sets
              </h2>

              <div className="space-y-2">
                {studySets.map((set) => (
                  <div
                    key={set.id}
                    className="rounded-xl border border-white/10 bg-white/10 p-4"
                  >
                    <p className="font-medium">{set.title}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {set.count} cards · Demo data
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            aria-label={
              trayOpen ? "Close study sets" : "Open study sets"
            }
            aria-expanded={trayOpen}
            onClick={() => setTrayOpen((value) => !value)}
            className="rounded-full border border-white/35 bg-gradient-to-r from-fuchsia-400/30 via-purple-400/30 to-cyan-400/30 px-8 py-3 text-sm font-semibold shadow-[0_0_40px_rgba(197,140,255,0.3)] backdrop-blur-2xl transition hover:scale-105"
          >
            ✧ {trayOpen ? "Close" : "My Study Sets"} ✧
          </button>
        </div>
      )}

      <footer className="relative z-10 pb-28 pt-10 text-center text-xs tracking-[0.2em] text-white/30 uppercase">
        SCENES · Your space, your rules
      </footer>
    </main>
  );
}
