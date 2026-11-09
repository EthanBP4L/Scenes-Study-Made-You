
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import FloatingControl from "./FloatingControl";

const destinations = [
  {
    label: "Home",
    href: "/",
    symbol: "✦",
    description: "The SCENES homepage",
  },
  {
    label: "Zimmer",
    href: "/zimmer",
    symbol: "☾",
    description: "Your personal room and profile",
  },
  {
    label: "Study Bay",
    href: "/study-bay",
    symbol: "✧",
    description: "Your PDFs, decks, and study space",
  },
  {
    label: "Posts",
    href: "/posts",
    symbol: "❋",
    description: "The SCENES community",
  },
];

export default function NavigationOrb() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (!isExpanded) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isExpanded]);

  return (
    <>
      {isExpanded && (
        <div
          id="navigation-orb-menu"
          className="fixed left-1/2 top-1/2 z-[80] w-[min(340px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-purple-200/25 bg-[#20162f]/95 p-3 text-white shadow-[0_20px_80px_rgba(8,5,29,0.65)] backdrop-blur-2xl"
        >
          <div className="border-b border-white/10 px-3 pb-3 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-pink-200/75">
              Your Universe
            </p>

            <h2 className="mt-1 text-xl font-black text-purple-50">
              Explore SCENES ✦
            </h2>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="mt-2 text-xs text-purple-200 underline underline-offset-4 hover:text-white"
            >
              Close menu
            </button>
          </div>

          <nav
            aria-label="SCENES navigation"
            className="mt-2 grid gap-1"
          >
            {destinations.map((destination) => {
              const active = pathname === destination.href;

              return (
                <Link
                  key={destination.href}
                  href={destination.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setIsExpanded(false)}
                  className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${
                    active
                      ? "border-purple-300/35 bg-purple-400/20"
                      : "border-transparent hover:border-white/10 hover:bg-white/10"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-200/20 bg-gradient-to-br from-purple-300/25 to-pink-300/10 text-xl"
                  >
                    {destination.symbol}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-purple-50">
                      {destination.label}
                    </span>

                    <span className="block text-xs text-purple-100/60">
                      {destination.description}
                    </span>
                  </span>

                  <span className="text-xs text-pink-200">
                    {active ? "HERE" : "→"}
                  </span>
                </Link>
              );
            })}
          </nav>

          <p className="px-3 pb-1 pt-3 text-center text-[10px] text-purple-100/40">
            study made you ✦
          </p>
        </div>
      )}

      <FloatingControl
        storageKey="scenes-navigation-orb-position-v1"
        initialPosition="bottom-center"
      >
        <div id="navigation-orb">
          <button
            type="button"
            aria-label={
              isExpanded ? "Close navigation" : "Explore SCENES"
            }
            aria-expanded={isExpanded}
            aria-controls="navigation-orb-menu"
            onClick={() => setIsExpanded((current) => !current)}
            className={`scene-orb flex cursor-grab items-center justify-center rounded-full border border-white/30 bg-white/10 text-white shadow-xl backdrop-blur-xl active:cursor-grabbing ${
              isExpanded
                ? "scene-orb-expanded"
                : "scene-orb-collapsed"
            }`}
          >
            <span className="text-[10px] tracking-widest">
              {isExpanded ? "CLOSE" : "EXPLORE"}
            </span>
          </button>
        </div>
      </FloatingControl>
    </>
  );
}
