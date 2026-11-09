
"use client";
import NavigationOrb from "./NavigationOrb";
import { useEffect, useRef, useState } from "react";
import Moveable from "react-moveable";

import defaultZimmerPreset from "../lib/defaultZimmerPreset.json";
import { graphicsLibrary } from "../lib/graphicsLibrary";
import type { ZimmerDraft, ZimmerObject } from "../lib/zimmerTypes";
import { createZimmerObject } from "../lib/zimmerTypes";

import ZimmerObjectRenderer from "./ZimmerObjectRenderer";
import FloatingControl from "./FloatingControl";
import ZimmerEditor from "./ZimmerEditor";

const ORIGINAL_GRADIENT =
  "radial-gradient(ellipse at 72% 18%, #6b4d8d 0%, #3a2959 38%, #18152f 72%, #0b1025 100%)";

type ObjectPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function safeMediaUrl(url: string): string | null {
  const trimmed = url.trim();

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    ) {
      return parsed.href;
    }
  } catch {
    return null;
  }

  return null;
}

function createDemoZimmer(): ZimmerDraft {
  return structuredClone(defaultZimmerPreset.room) as ZimmerDraft;
}

type ZimmerCanvasProps = {
  pageName?: string;
  initialRoom?: ZimmerDraft;
  showNavigation?: boolean;
};

export default function ZimmerCanvas({
  pageName = "Zimmer",
  initialRoom,
  showNavigation = false,
}: ZimmerCanvasProps) {
  const [room, setRoom] = useState<ZimmerDraft>(
    () =>
      structuredClone(
        initialRoom ?? createDemoZimmer()
      ) as ZimmerDraft
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const pendingTransform = useRef<ObjectPosition | null>(null);

  const selectedObject =
    room.objects.find((object) => object.id === selectedId) ?? null;

  const isEditing = editorOpen;
  const maxObjectsReached = room.objects.length >= 100;

  function closeEditor() {
    setEditorOpen(false);
    setSelectedId(null);
    pendingTransform.current = null;
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isEditing || !selectedId) return;

      if (
        event.key !== "Delete" &&
        event.key !== "Backspace"
      ) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable]")
      ) {
        return;
      }

      const selected = room.objects.find(
        (object) => object.id === selectedId
      );

      if (!selected || selected.locked) return;

      event.preventDefault();

      setRoom((current) => ({
        ...current,
        objects: current.objects.filter(
          (object) => object.id !== selectedId
        ),
      }));

      setSelectedId(null);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditing, selectedId, room.objects]);

  function getSelectedElement(): HTMLElement | null {
    if (!selectedId || !canvasRef.current) {
      return null;
    }

    const elements =
      canvasRef.current.querySelectorAll<HTMLElement>(
        "[data-zimmer-object-id]"
      );

    return (
      Array.from(elements).find(
        (element) =>
          element.dataset.zimmerObjectId === selectedId
      ) ?? null
    );
  }

  function saveTransform() {
    if (!selectedId || !pendingTransform.current) {
      return;
    }

    const finalTransform = pendingTransform.current;

    setRoom((current) => ({
      ...current,
      objects: current.objects.map((object) =>
        object.id === selectedId
          ? {
              ...object,
              transform: {
                ...object.transform,
                ...finalTransform,
              },
            }
          : object
      ),
    }));

    pendingTransform.current = null;
  }

  function duplicateSelected() {
    if (!selectedObject || maxObjectsReached) {
      return;
    }

    const copy: ZimmerObject = {
      ...selectedObject,
      id: crypto.randomUUID(),
      name: `${selectedObject.name} Copy`,
      transform: {
        ...selectedObject.transform,
        x: selectedObject.transform.x + 30,
        y: selectedObject.transform.y + 30,
        zIndex:
          Math.max(
            0,
            ...room.objects.map(
              (object) => object.transform.zIndex
            )
          ) + 1,
      },
      appearance: {
        ...selectedObject.appearance,
      },
      animation: {
        ...selectedObject.animation,
      },
    };

    setRoom((current) => ({
      ...current,
      objects: [...current.objects, copy],
    }));

    setSelectedId(copy.id);
  }

  function moveSelectedLayer(
    direction: "forward" | "backward"
  ) {
    if (!selectedId) return;

    setRoom((current) => {
      const sorted = [...current.objects].sort(
        (a, b) =>
          a.transform.zIndex - b.transform.zIndex
      );

      const selectedIndex = sorted.findIndex(
        (object) => object.id === selectedId
      );

      if (selectedIndex === -1) {
        return current;
      }

      const [selected] = sorted.splice(selectedIndex, 1);

      if (direction === "forward") {
        sorted.push(selected);
      } else {
        sorted.unshift(selected);
      }

      return {
        ...current,
        objects: sorted.map((object, index) => ({
          ...object,
          transform: {
            ...object.transform,
            zIndex: index + 1,
          },
        })),
      };
    });
  }

  function toggleSelectedLock() {
    if (!selectedId) return;

    setRoom((current) => ({
      ...current,
      objects: current.objects.map((object) =>
        object.id === selectedId
          ? {
              ...object,
              locked: !object.locked,
            }
          : object
      ),
    }));
  }

  function removeSelected() {
    if (!selectedId || selectedObject?.locked) {
      return;
    }

    setRoom((current) => ({
      ...current,
      objects: current.objects.filter(
        (object) => object.id !== selectedId
      ),
    }));

    setSelectedId(null);
  }

  function addText() {
    if (maxObjectsReached) return;

    const object = createZimmerObject(
      crypto.randomUUID(),
      "text",
      "New Text"
    );

    object.content = "Your text here";

    object.transform.zIndex =
      Math.max(
        0,
        ...room.objects.map(
          (item) => item.transform.zIndex
        )
      ) + 1;

    setRoom((current) => ({
      ...current,
      objects: [...current.objects, object],
    }));

    setSelectedId(object.id);
  }

  function addSticker(assetId: string) {
    const sticker = graphicsLibrary.find(
      (asset) =>
        asset.id === assetId &&
        asset.category === "stickers"
    );

    if (!sticker || maxObjectsReached) {
      return;
    }

    const object = createZimmerObject(
      crypto.randomUUID(),
      "sticker",
      sticker.name
    );

    object.mediaUrl = sticker.src;

    object.transform = {
      ...object.transform,
      x: 300,
      y: 180,
      width: 220,
      height: 220,
      zIndex:
        Math.max(
          0,
          ...room.objects.map(
            (item) => item.transform.zIndex
          )
        ) + 1,
    };

    object.appearance = {
      ...object.appearance,
      backgroundColor: "transparent",
      borderWidth: 0,
      boxShadow: "none",
    };

    setRoom((current) => ({
      ...current,
      objects: [...current.objects, object],
    }));

    setSelectedId(object.id);
  }

  function addGifFromUrl(url: string) {
    const safeUrl = safeMediaUrl(url);

    if (!safeUrl || maxObjectsReached) {
      return;
    }

    const object = createZimmerObject(
      crypto.randomUUID(),
      "gif",
      "GIF"
    );

    object.mediaUrl = safeUrl;

    object.transform = {
      x: 580,
      y: 335,
      width: 250,
      height: 200,
      rotation: 0,
      zIndex:
        Math.max(
          0,
          ...room.objects.map(
            (item) => item.transform.zIndex
          )
        ) + 1,
    };

    object.appearance = {
      ...object.appearance,
      backgroundColor: "transparent",
      borderWidth: 0,
      borderRadius: 22,
      boxShadow: "0 12px 45px rgba(0,0,0,0.3)",
    };

    setRoom((current) => ({
      ...current,
      objects: [...current.objects, object],
    }));

    setSelectedId(object.id);
  }

  function setEditorBackground(
    type: "gradient" | "color" | "image" | "gif",
    value?: string
  ) {
    if (
      (type === "gif" || type === "image") &&
      (!value || !safeMediaUrl(value))
    ) {
      return;
    }

    setRoom((current) => ({
      ...current,
      background: {
        ...current.background,
        type,
        color:
          type === "color"
            ? value ?? current.background.color
            : current.background.color,
        gradient:
          type === "gradient"
            ? value ?? ORIGINAL_GRADIENT
            : current.background.gradient,
        mediaUrl:
          type === "gif" || type === "image"
            ? value ?? null
            : null,
      },
    }));
  }

  function updateSelectedObject(
    changes: Partial<ZimmerObject>
  ) {
    if (!selectedId) return;

    setRoom((current) => ({
      ...current,
      objects: current.objects.map((object) =>
        object.id === selectedId && !object.locked
          ? {
              ...object,
              ...changes,
              id: object.id,
              locked: object.locked,
              transform: object.transform,
            }
          : object
      ),
    }));
  }

  async function copyZimmerLayout() {
    const exportData = {
      presetName: `SCENES Default ${pageName}`,
      presetVersion: 1,
      canvas: {
        width: 1200,
        height: 1000,
      },
      room: {
        ...room,
        objects: room.objects.map((object) => ({
          ...object,
          transform: { ...object.transform },
          appearance: { ...object.appearance },
          animation: { ...object.animation },
        })),
      },
    };

    const json = JSON.stringify(exportData, null, 2);

    try {
      await navigator.clipboard.writeText(json);

      window.alert(
  `${pageName} layout copied! Paste the JSON into ChatGPT.`
);
    } catch {
      window.prompt(
  `Copy your ${pageName} layout JSON:`,
  json
);
    }
  }

  const backgroundMedia = room.background.mediaUrl
    ? safeMediaUrl(room.background.mediaUrl)
    : null;

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: room.background.color,
    backgroundImage:
      room.background.type === "gradient"
        ? room.background.gradient
        : (
            room.background.type === "gif" ||
            room.background.type === "image"
          ) && backgroundMedia
        ? `url("${backgroundMedia.replace(
            /["\\]/g,
            ""
          )}")`
        : "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  return (
    <div className="relative min-h-screen bg-[#171026] px-4 py-5 text-white sm:px-6 sm:py-6">
      <style>{`
        .zimmer-room
          [data-zimmer-object-type="section"]
          > div > div,
        .zimmer-room
          [data-zimmer-object-type="text"]
          > div > div {
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color:
            rgba(224,190,255,.45) transparent;
        }

        .zimmer-room:not(.zimmer-editing)
          [data-zimmer-object-id] {
          cursor: default !important;
        }
      `}</style>

      <FloatingControl
  storageKey={`scenes-${pageName.toLowerCase()}-raindrop-position-v1`}
  initialPosition="top-right"
>
        <button
          id="zimmer-edit-raindrop"
          type="button"
          aria-label={
            editorOpen
              ? "Close Zimmer customization editor"
              : "Open Zimmer customization editor"
          }
          aria-expanded={editorOpen}
          onClick={() => {
            if (editorOpen) {
              closeEditor();
            } else {
              setEditorOpen(true);
            }
          }}
          className="flex h-12 w-12 cursor-grab items-center justify-center rounded-full border border-white/30 bg-[#201735]/80 text-xl shadow-xl backdrop-blur-xl transition hover:bg-purple-400/30 active:cursor-grabbing"
        >
          💧
        </button>
      </FloatingControl>

      {editorOpen && (
        <div className="fixed bottom-5 right-5 z-[100]">
          <button
            type="button"
            onClick={copyZimmerLayout}
            className="rounded-full border border-purple-300/40 bg-[#24183B] px-5 py-3 text-sm font-bold text-pink-100 shadow-[0_12px_35px_rgba(0,0,0,0.45)] transition hover:bg-[#50386D]"
          >
            ✦ Copy Layout JSON
          </button>
        </div>
      )}

      {editorOpen && (
        <ZimmerEditor
  pageName={pageName}
  launcherId="zimmer-edit-raindrop"
  editorStorageKey={`scenes-${pageName.toLowerCase()}-editor-position-v1`}
  selectedObject={selectedObject}
          background={room.background}
          onClose={closeEditor}
          onAddText={addText}
          stickers={graphicsLibrary.filter(
            (asset) => asset.category === "stickers"
          )}
          onAddSticker={addSticker}
          onAddGif={addGifFromUrl}
          onSetBackground={setEditorBackground}
          onUpdateObject={updateSelectedObject}
          onDuplicate={duplicateSelected}
          onDelete={removeSelected}
          onBringForward={() =>
            moveSelectedLayer("forward")
          }
          onSendBackward={() =>
            moveSelectedLayer("backward")
          }
          onToggleLock={toggleSelectedLock}
        />
      )}

      <div
        ref={canvasRef}
        className={`zimmer-room relative mx-auto min-h-[1000px] w-full max-w-[1200px] overflow-hidden rounded-[6px] ring-1 ring-purple-300/10 ${
  isEditing ? "zimmer-editing" : ""
}`}
        style={backgroundStyle}
        onClick={() => {
          if (isEditing) {
            setSelectedId(null);
          }
        }}
      >
        {room.objects.map((object) => (
          <ZimmerObjectRenderer
            key={object.id}
            object={object}
            selected={
              isEditing && selectedId === object.id
            }
            onSelect={
              isEditing ? setSelectedId : undefined
            }
          />
        ))}
      </div>

      {isEditing &&
        selectedObject &&
        !selectedObject.locked && (
          <Moveable
            target={getSelectedElement()}
            draggable={true}
            resizable={true}
            rotatable={true}
            origin={false}
            throttleDrag={0}
            throttleResize={0}
            keepRatio={false}
            onDragStart={() => {
              pendingTransform.current = {
                x: selectedObject.transform.x,
                y: selectedObject.transform.y,
                width: selectedObject.transform.width,
                height: selectedObject.transform.height,
              };
            }}
            onDrag={({ beforeTranslate }) => {
              const element = getSelectedElement();

              if (!element || !pendingTransform.current) {
                return;
              }

              const x =
                selectedObject.transform.x +
                beforeTranslate[0];

              const y =
                selectedObject.transform.y +
                beforeTranslate[1];

              pendingTransform.current = {
                ...pendingTransform.current,
                x,
                y,
              };

              element.style.left = `${x}px`;
              element.style.top = `${y}px`;
            }}
            onDragEnd={saveTransform}
            onResizeStart={() => {
              pendingTransform.current = {
                x: selectedObject.transform.x,
                y: selectedObject.transform.y,
                width: selectedObject.transform.width,
                height: selectedObject.transform.height,
              };
            }}
            onResize={({ width, height, drag }) => {
              const element = getSelectedElement();

              if (!element || !pendingTransform.current) {
                return;
              }

              const x =
                selectedObject.transform.x +
                drag.beforeTranslate[0];

              const y =
                selectedObject.transform.y +
                drag.beforeTranslate[1];

              pendingTransform.current = {
                x,
                y,
                width,
                height,
              };

              element.style.left = `${x}px`;
              element.style.top = `${y}px`;
              element.style.width = `${width}px`;
              element.style.height = `${height}px`;
            }}
            onResizeEnd={saveTransform}
            onRotate={({ beforeRotate }) => {
              const element = getSelectedElement();

              if (!element) return;

              element.style.transform =
                `rotate(${beforeRotate}deg)`;
            }}
            onRotateEnd={({ lastEvent }) => {
              if (!selectedId || !lastEvent) {
                return;
              }

              const finalRotation =
                lastEvent.beforeRotate;

              setRoom((current) => ({
                ...current,
                objects: current.objects.map(
                  (object) =>
                    object.id === selectedId
                      ? {
                          ...object,
                          transform: {
                            ...object.transform,
                            rotation: finalRotation,
                          },
                        }
                      : object
                ),
              }));
            }}
          />
        )}
      {showNavigation && <NavigationOrb />}
    </div>
  );
}
