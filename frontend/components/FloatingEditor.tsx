
"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
  launcherId: string;
  storageKey: string;
  ariaLabel: string;
};

type Position = {
  x: number;
  y: number;
};

const EDGE = 12;

export default function FloatingEditor({
  children,
  launcherId,
  storageKey,
  ariaLabel,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<Position>({ x: 0, y: 0 });

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const [position, setPosition] = useState<Position>({
    x: 0,
    y: 0,
  });
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);

  function clampPosition(next: Position): Position {
    const panel = panelRef.current;
    const width = panel?.offsetWidth ?? 340;
    const height = panel?.offsetHeight ?? 500;

    return {
      x: Math.max(
        EDGE,
        Math.min(next.x, window.innerWidth - width - EDGE)
      ),
      y: Math.max(
        EDGE,
        Math.min(next.y, window.innerHeight - height - EDGE)
      ),
    };
  }

  function updatePosition(next: Position) {
    const safe = clampPosition(next);
    positionRef.current = safe;
    setPosition(safe);
  }

  useEffect(() => {
    const launcher = document.getElementById(launcherId);
    const rect = launcher?.getBoundingClientRect();

    const panel = panelRef.current;
    const width = panel?.offsetWidth ?? 340;
    const height = panel?.offsetHeight ?? 500;

    let initial: Position = {
      x: (window.innerWidth - width) / 2,
      y: (window.innerHeight - height) / 2,
    };

    if (rect) {
      const gap = 12;

      const fitsLeft = rect.left >= width + gap + EDGE;
      const fitsRight =
        window.innerWidth - rect.right >= width + gap + EDGE;

      let x: number;

      if (fitsRight) {
        x = rect.right + gap;
      } else if (fitsLeft) {
        x = rect.left - width - gap;
      } else {
        x = rect.left + rect.width / 2 - width / 2;
      }

      initial = {
        x,
        y: rect.top,
      };
    }

    // Open beside the raindrop every time.
    // Do not load an old editor position.
    updatePosition(initial);
    setReady(true);

    function handleResize() {
      updatePosition(positionRef.current);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [launcherId]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    const target = event.target;

    if (!(target instanceof Element)) return;
    if (!target.closest("[data-panel-drag-handle]")) return;

    if (
      target.closest(
        "button, input, textarea, select, a"
      )
    ) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
      moved: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.moved && Math.hypot(dx, dy) < 5) {
      return;
    }

    if (!drag.moved) {
      drag.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    updatePosition({
      x: drag.originX + dx,
      y: drag.originY + dy,
    });
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      className={`fixed z-[100] flex w-[min(300px,calc(100vw-24px))] flex-col overflow-hidden rounded-[28px] border border-purple-200/30 bg-gradient-to-br from-[#38224f]/95 via-[#211833]/95 to-[#11172d]/95 p-3 text-white shadow-[0_24px_90px_rgba(13,5,36,0.7)] backdrop-blur-2xl ${
  dragging ? "cursor-grabbing" : ""
}`}
      style={{
        left: position.x,
        top: position.y,
        height: "min(400px, calc(100dvh - 32px))",
        visibility: ready ? "visible" : "hidden",
      }}
    >
      {children}
    </div>
  );
}
