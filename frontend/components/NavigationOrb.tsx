
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import FloatingControl from "./FloatingControl";
import { useAuth } from "./AuthProvider";


const destinations = [
  {
    label: "Home",
    href: "/home",
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
    label: "Flashcards",
    href: "/flashcards",
    symbol: "✎",
    description: "Your flashcard decks and study sessions",
  },
  {
    label: "Posts",
    href: "/posts",
    symbol: "❋",
    description: "The SCENES community",
  },
];


type Position = {
  x: number;
  y: number;
};

const GAP = 12;
const EDGE = 12;

export default function NavigationOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<Position>({
    x: 0,
    y: 0,
  });
  const [positionReady, setPositionReady] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  async function handleLogout() {
    setLogoutError("");
    setLoggingOut(true);

    try {
      await logout();
      setIsOpen(false);
    } catch {
      setLogoutError("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      setPositionReady(false);
      return;
    }

    function updateMenuPosition() {
      const orb = document.getElementById("navigation-orb");
      const menu = menuRef.current;

      if (!orb || !menu) return;

      const orbRect = orb.getBoundingClientRect();
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const roomRight = viewportWidth - orbRect.right;
      const roomLeft = orbRect.left;
      const roomAbove = orbRect.top;
      const roomBelow = viewportHeight - orbRect.bottom;

      let x: number;
      let y: number;

      if (roomRight >= menuWidth + GAP + EDGE) {
        x = orbRect.right + GAP;
        y = orbRect.top;
      } else if (roomLeft >= menuWidth + GAP + EDGE) {
        x = orbRect.left - menuWidth - GAP;
        y = orbRect.top;
      } else if (roomAbove >= menuHeight + GAP + EDGE) {
        x = orbRect.left + orbRect.width / 2 - menuWidth / 2;
        y = orbRect.top - menuHeight - GAP;
      } else if (roomBelow >= menuHeight + GAP + EDGE) {
        x = orbRect.left + orbRect.width / 2 - menuWidth / 2;
        y = orbRect.bottom + GAP;
      } else {
        x =
          roomRight >= roomLeft
            ? orbRect.right + GAP
            : orbRect.left - menuWidth - GAP;

        y = orbRect.top;
      }

      x = Math.max(
        EDGE,
        Math.min(x, viewportWidth - menuWidth - EDGE)
      );

      y = Math.max(
        EDGE,
        Math.min(y, viewportHeight - menuHeight - EDGE)
      );

      setMenuPosition((previous) => {
        if (
          Math.abs(previous.x - x) < 0.5 &&
          Math.abs(previous.y - y) < 0.5
        ) {
          return previous;
        }

        return { x, y };
      });

      setPositionReady(true);
    }

    let frame = 0;

    function followOrb() {
      updateMenuPosition();
      frame = window.requestAnimationFrame(followOrb);
    }

    frame = window.requestAnimationFrame(followOrb);

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updateMenuPosition);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          ref={menuRef}
          id="navigation-orb-menu"
          className="fixed z-[100] w-[min(300px,calc(100vw-24px))] max-h-[min(400px,calc(100dvh-24px))] overflow-y-auto rounded-[28px] border border-purple-200/25 bg-[#20162f]/95 p-3 text-white shadow-[0_20px_80px_rgba(8,5,29,0.65)] backdrop-blur-2xl"
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
            visibility: positionReady ? "visible" : "hidden",
          }}
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
              onClick={() => setIsOpen(false)}
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
                  onClick={() => setIsOpen(false)}
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

          {user && (
            <div className="mt-3 border-t border-white/10 px-3 pt-3">
              <p className="mb-2 text-xs text-purple-100/70">
                Signed in as{" "}
                <span className="font-semibold text-pink-200">
                  {user.username}
                </span>
              </p>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full rounded-xl border border-pink-300/25 bg-pink-400/10 px-4 py-2.5 text-sm font-semibold text-pink-100 transition hover:bg-pink-400/20 disabled:opacity-50"
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </button>

              {logoutError && (
                <p
                  role="alert"
                  className="mt-2 text-xs text-pink-200"
                >
                  {logoutError}
                </p>
              )}
            </div>
          )}

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
            aria-label={isOpen ? "Close navigation" : "Explore SCENES"}
            aria-expanded={isOpen}
            aria-controls="navigation-orb-menu"
            onClick={() => setIsOpen((current) => !current)}
            className="scene-orb scene-orb-collapsed flex cursor-grab items-center justify-center rounded-full border border-white/30 bg-white/10 text-white shadow-xl backdrop-blur-xl active:cursor-grabbing"
          >
            <span className="text-[10px] tracking-widest">
              EXPLORE
            </span>
          </button>
        </div>
      </FloatingControl>
    </>
  );
}
