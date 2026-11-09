
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
  storageKey: string;
  initialPosition: "bottom-center" | "top-right";
  className?: string;
};

type Position = {
  x: number;
  y: number;
};

const MARGIN = 12;

export default function FloatingControl({
  children,
  storageKey,
  initialPosition,
  className = "",
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const positionRef = useRef<Position>({ x: 0, y: 0 });

  const [position, setPosition] = useState<Position>({
    x: 0,
    y: 0,
  });

  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);

  function clampPosition(next: Position): Position {
    const element = wrapperRef.current;

    const width = element?.offsetWidth ?? 56;
    const height = element?.offsetHeight ?? 56;

    return {
      x: Math.max(
        MARGIN,
        Math.min(next.x, window.innerWidth - width - MARGIN)
      ),
      y: Math.max(
        MARGIN,
        Math.min(next.y, window.innerHeight - height - MARGIN)
      ),
    };
  }

  function updatePosition(next: Position) {
    const clamped = clampPosition(next);

    positionRef.current = clamped;
    setPosition(clamped);
  }

  useEffect(() => {
    const element = wrapperRef.current;

    const width = element?.offsetWidth ?? 56;
    const height = element?.offsetHeight ?? 56;

    let initial: Position =
      initialPosition === "bottom-center"
        ? {
            x: (window.innerWidth - width) / 2,
            y: window.innerHeight - height - 32,
          }
        : {
            x: window.innerWidth - width - 24,
            y: 24,
          };

    try {
      const saved = window.localStorage.getItem(storageKey);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (
          parsed &&
          typeof parsed === "object" &&
          "x" in parsed &&
          "y" in parsed &&
          typeof parsed.x === "number" &&
          typeof parsed.y === "number" &&
          Number.isFinite(parsed.x) &&
          Number.isFinite(parsed.y)
        ) {
          initial = {
            x: parsed.x,
            y: parsed.y,
          };
        }
      }
    } catch {
      // Use the default position if storage is unavailable.
    }

    updatePosition(initial);
    setReady(true);

    function handleResize() {
      updatePosition(positionRef.current);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [storageKey, initialPosition]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    if (
      event.target instanceof HTMLElement &&
      event.target.closest("input, textarea, select")
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

    // IMPORTANT:
    // Do not capture the pointer here.
    // Normal clicks must still reach the button.
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.moved && Math.hypot(dx, dy) < 6) {
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

    if (drag.moved) {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify(positionRef.current)
        );
      } catch {
        // Dragging works even if storage is unavailable.
      }

      // Prevent the click that follows a drag.
      event.preventDefault();
    }

    dragRef.current = null;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      ref={wrapperRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClickCapture={(event) => {
        // If a pointer drag is still active, don't activate the button.
        if (dragRef.current?.moved) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      className={`fixed z-[90] touch-none select-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      } ${className}`}
      style={{
        left: position.x,
        top: position.y,
        visibility: ready ? "visible" : "hidden",
      }}
    >
      {children}
    </div>
  );
}
