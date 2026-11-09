
"use client";

import { useEffect, useRef, useState } from "react";
import Moveable from "react-moveable";
import { graphicsLibrary } from "../lib/graphicsLibrary";
import type { ZimmerDraft, ZimmerObject } from "../lib/zimmerTypes";
import {
  createDefaultZimmer,
  createZimmerObject,
} from "../lib/zimmerTypes";
import ZimmerObjectRenderer from "./ZimmerObjectRenderer";
import FloatingControl from "./FloatingControl";
import ZimmerEditor from "./ZimmerEditor";

const CLOUD_GIF = "/graphics/backgrounds/lavender-clouds-v2.gif";

const ORIGINAL_GRADIENT =
  "radial-gradient(ellipse at 72% 18%, #6b4d8d 0%, #3a2959 38%, #18152f 72%, #0b1025 100%)";

function createDemoZimmer(): ZimmerDraft {
  const room = createDefaultZimmer();

  room.name = "My Zimmer";
  room.background = {
    type: "gradient",
    color: "#080817",
    gradient: ORIGINAL_GRADIENT,
    mediaUrl: null,
  };

  function addTextBlock(
    id: string,
    name: string,
    content: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: number,
    color: string,
    zIndex: number,
    rotation = 0,
    weight = 400
  ) {
    const object = createZimmerObject(id, "text", name);
    object.content = content;
    object.transform = {
      x, y, width, height, rotation, zIndex,
    };
    object.appearance = {
      ...object.appearance,
      fontSize,
      fontWeight: weight,
      color,
      backgroundColor: "transparent",
      borderWidth: 0,
    };
    room.objects.push(object);
  }

  function addSection(
    id: string,
    name: string,
    content: string,
    x: number,
    y: number,
    width: number,
    height: number,
    zIndex: number,
    rotation = 0,
    backgroundColor = "rgba(255, 240, 252, 0.12)",
    borderColor = "#e6c4ff",
    fontSize = 18
  ) {
    const object = createZimmerObject(id, "section", name);
    object.content = content;
    object.transform = {
      x, y, width, height, rotation, zIndex,
    };
    object.appearance = {
      ...object.appearance,
      backgroundColor,
      borderColor,
      borderWidth: 1,
      borderStyle: "solid",
      borderRadius: 26,
      boxShadow: "0 18px 60px rgba(8, 5, 29, 0.34)",
      color: "#fff5ff",
      fontSize,
    };
    room.objects.push(object);
  }

  function addSticker(
    id: string,
    name: string,
    filename: string,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    zIndex: number
  ) {
    const object = createZimmerObject(id, "sticker", name);
    object.mediaUrl = `/graphics/stickers/${filename}`;
    object.transform = {
      x, y, width, height, rotation, zIndex,
    };
    object.appearance = {
      ...object.appearance,
      backgroundColor: "transparent",
      borderWidth: 0,
      boxShadow: "none",
    };
    room.objects.push(object);
  }

  // Exact existing default layout.
  // Positions and sizes are intentionally unchanged.

  addTextBlock(
    "intro-line",
    "Intro Line",
    "✦ YOUR CORNER OF SCENES ✦",
    85, 60, 400, 36, 15, "#efd6ff", 4, 0, 700
  );

  addTextBlock(
    "username-title",
    "Username Title",
    "@yourname",
    78, 104, 560, 90, 68, "#ffe4fb", 8, -2, 900
  );

  addTextBlock(
    "header-status",
    "Header Status",
    "say something about yourself here",
    95, 190, 460, 42, 21, "#e8d9ff", 7, -1, 500
  );

  addTextBlock(
    "layout-note",
    "Layout Note",
    "Move, edit, resize, restyle, or delete anything.",
    92, 228, 470, 34, 15, "#d2c3ea", 6, 0, 500
  );

  addSection(
    "about-section",
    "About Section",
    "ABOUT ME\n\nTell people who you are, what you love, what you're studying, or whatever makes this space feel like yours.\n\n✦ This section is fully editable.",
    85, 315, 385, 250, 6, -2,
    "rgba(255, 234, 249, 0.14)", "#f0c0ff", 18
  );

  addSection(
    "favorites-section",
    "Favorites Section",
    "CURRENTLY INTO\n\n• favorite music\n• favorite shows\n• favorite topic\n• latest obsession\n\n✦ Keep this, change it, or replace it.",
    510, 300, 280, 215, 5, 2,
    "rgba(33, 25, 68, 0.72)", "#b8a3ef", 18
  );

  addSection(
    "decor-section",
    "Decor Section",
    "GRAPHICS + DECOR\n\nAdd stickers, images, and visual elements here — or anywhere else in your Zimmer.\n\n✦ This area hints at what's possible.",
    820, 265, 300, 215, 5, -2,
    "rgba(255, 244, 232, 0.12)", "#ffd7ef", 18
  );

  addSection(
    "study-section",
    "Study Sets Section",
    "STUDY SETS\n\nYour sets can live on the page or inside a tray.\n\nFor the prototype, this shows where your study identity can appear inside your personal room.",
    505, 560, 355, 165, 5, -1,
    "rgba(20, 17, 52, 0.76)", "#a995eb", 18
  );

  addSection(
    "customize-section",
    "Customize Section",
    "START HERE\n\nUse the editor to:\n• change colors\n• edit text\n• move sections\n• add graphics\n• make the room fully yours",
    85, 590, 355, 155, 5, 1,
    "rgba(255, 225, 250, 0.11)", "#efc6ff", 18
  );

  addTextBlock(
    "footer-line",
    "Footer Line",
    "your room can be clean, chaotic, dreamy, academic, playful — whatever you want",
    505, 742, 575, 36, 16, "#d7c9f0", 5, 0, 500
  );

  addSticker(
    "rose-sticker", "Pink Rose", "pink-rose.png",
    935, 65, 185, 185, 10, 3
  );

  addSticker(
    "butterfly-sticker", "Purple Butterfly",
    "purple-butterfly.png",
    720, 118, 150, 150, -18, 8
  );

  addSticker(
    "heart-sticker", "Chrome Heart", "chrome-heart.png",
    16, 255, 145, 145, -15, 7
  );

  addSticker(
    "bow-sticker", "Pink Bow", "pink-bow.png",
    395, 535, 138, 138, 10, 7
  );

  addSticker(
    "sparkle-sticker", "Silver Sparkle",
    "silver-sparkle.png",
    1080, 225, 90, 90, 0, 6
  );

  addSticker(
    "chain-sticker", "Silver Chain",
    "silver-chain.png",
    875, 520, 175, 115, -10, 4
  );

  return room;
}

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
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch {
    return null;
  }

  return null;
}

function hexColor(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : "#ffffff";
}

const toolButton =
  "rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40";

export default function ZimmerCanvas() {
  const [room, setRoom] = useState<ZimmerDraft>(createDemoZimmer);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [backgroundError, setBackgroundError] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const pendingTransform = useRef<ObjectPosition | null>(null);

  const selectedObject =
    room.objects.find((object) => object.id === selectedId) ?? null;

  const maxObjectsReached = room.objects.length >= 100;

  function toggleEditMode() {
    setIsEditing((current) => !current);
    setSelectedId(null);
    pendingTransform.current = null;
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isEditing || !selectedId) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

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
    if (!selectedId || !canvasRef.current) return null;

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
    if (!selectedId || !pendingTransform.current) return;

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
    if (!selectedObject || maxObjectsReached) return;

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
            ...room.objects.map((object) => object.transform.zIndex)
          ) + 1,
      },
      appearance: { ...selectedObject.appearance },
      animation: { ...selectedObject.animation },
    };

    setRoom((current) => ({
      ...current,
      objects: [...current.objects, copy],
    }));

    setSelectedId(copy.id);
  }

  function moveSelectedLayer(direction: "forward" | "backward") {
    if (!selectedId) return;

    setRoom((current) => {
      const sorted = [...current.objects].sort(
        (a, b) => a.transform.zIndex - b.transform.zIndex
      );

      const selectedIndex = sorted.findIndex(
        (object) => object.id === selectedId
      );

      if (selectedIndex === -1) return current;

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
          ? { ...object, locked: !object.locked }
          : object
      ),
    }));
  }

  function removeSelected() {
    if (!selectedId || selectedObject?.locked) return;

    setRoom((current) => ({
      ...current,
      objects: current.objects.filter(
        (object) => object.id !== selectedId
      ),
    }));

    setSelectedId(null);
  }

  function updateSelectedAppearance(
    changes: Partial<ZimmerObject["appearance"]>
  ) {
    if (!selectedId || selectedObject?.locked) return;

    setRoom((current) => ({
      ...current,
      objects: current.objects.map((object) =>
        object.id === selectedId
          ? {
              ...object,
              appearance: {
                ...object.appearance,
                ...changes,
              },
            }
          : object
      ),
    }));
  }

  function updateSelectedContent(content: string) {
    if (!selectedId || selectedObject?.locked) return;

    setRoom((current) => ({
      ...current,
      objects: current.objects.map((object) =>
        object.id === selectedId
          ? { ...object, content }
          : object
      ),
    }));
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
        ...room.objects.map((item) => item.transform.zIndex)
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
        asset.id === assetId && asset.category === "stickers"
    );

    if (!sticker || maxObjectsReached) return;

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
          ...room.objects.map((item) => item.transform.zIndex)
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

  function addCloudGif() {
    if (maxObjectsReached) return;

    const object = createZimmerObject(
      crypto.randomUUID(),
      "gif",
      "Lavender Clouds"
    );

    object.mediaUrl = CLOUD_GIF;

    object.transform = {
      x: 580,
      y: 335,
      width: 250,
      height: 200,
      rotation: 0,
      zIndex:
        Math.max(
          0,
          ...room.objects.map((item) => item.transform.zIndex)
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

  function setBackgroundMode(mode: "gradient" | "color" | "gif") {
    setBackgroundError("");

    setRoom((current) => ({
      ...current,
      background: {
        ...current.background,
        type: mode,
        gradient: ORIGINAL_GRADIENT,
        mediaUrl: mode === "gif" ? CLOUD_GIF : null,
      },
    }));
  }

  function applyCustomBackground() {
    const url = safeMediaUrl(backgroundUrl);

    if (!url) {
      setBackgroundError(
        "Enter a valid image/GIF URL or a local path beginning with /."
      );
      return;
    }

    const type = /\.gif(?:[?#]|$)/i.test(url) ? "gif" : "image";

    setRoom((current) => ({
      ...current,
      background: {
        ...current.background,
        type,
        mediaUrl: url,
      },
    }));

    setBackgroundError("");
  }

  function addGifFromUrl(url: string) {
    const safeUrl = safeMediaUrl(url);
    if (!safeUrl || room.objects.length >= 100) return;

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
          ...room.objects.map((item) => item.transform.zIndex)
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
    if ((type === "gif" || type === "image") &&
        (!value || !safeMediaUrl(value))) {
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

  function addStickerFromPicker() {
    const stickers = graphicsLibrary.filter(
      (asset) => asset.category === "stickers"
    );

    if (stickers.length === 0) return;

    const choices = stickers
      .map((asset, index) => `${index + 1}. ${asset.name}`)
      .join("\n");

    const answer = window.prompt(
      `Choose a sticker by number:\n\n${choices}`,
      "1"
    );

    if (answer === null) return;

    const number = Number(answer);

    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > stickers.length
    ) {
      window.alert("Please choose a valid sticker number.");
      return;
    }

    addSticker(stickers[number - 1].id);
  }

  const backgroundMedia =
    room.background.mediaUrl
      ? safeMediaUrl(room.background.mediaUrl)
      : null;

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: room.background.color,
    backgroundImage:
      room.background.type === "gradient"
        ? room.background.gradient
        : (room.background.type === "gif" ||
            room.background.type === "image") &&
          backgroundMedia
        ? `url("${backgroundMedia.replace(/["\\]/g, "")}")`
        : "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  return (
    <div className="relative min-h-screen bg-[#080817] text-white">
      <style>{`
        .zimmer-room [data-zimmer-object-type="section"] > div > div,
        .zimmer-room [data-zimmer-object-type="text"] > div > div {
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(224,190,255,.45) transparent;
        }

        .zimmer-room:not(.zimmer-editing)
          [data-zimmer-object-id] {
          cursor: default !important;
        }
      `}</style>

      {/* Edit mode switch */}
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-white/10 bg-[#100d20]/95 px-5 py-3 backdrop-blur-md">
        <span className="text-sm font-semibold text-purple-100">
          My Zimmer
        </span>

        <button
          type="button"
          onClick={toggleEditMode}
          className="rounded-full border border-purple-300/30 bg-purple-500/20 px-5 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/35"
        >
          {isEditing ? "Done Editing ✓" : "✦ Edit Zimmer"}
        </button>
      </div>

      {/* Editing toolbar */}
      {isEditing && (
        <div className="relative z-20 flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/20 p-4">
          <button
            type="button"
            onClick={addText}
            disabled={maxObjectsReached}
            className={toolButton}
          >
            + Add Text
          </button>

          {graphicsLibrary
            .filter((asset) => asset.category === "stickers")
            .map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => addSticker(asset.id)}
                disabled={maxObjectsReached}
                className={toolButton}
              >
                {asset.name}
              </button>
            ))}

          <button
            type="button"
            onClick={addCloudGif}
            disabled={maxObjectsReached}
            className={toolButton}
          >
            + Add Moving Clouds
          </button>

          <button
            type="button"
            onClick={duplicateSelected}
            disabled={!selectedObject || maxObjectsReached}
            className={toolButton}
          >
            Duplicate
          </button>

          <button
            type="button"
            onClick={() => moveSelectedLayer("backward")}
            disabled={!selectedObject}
            className={toolButton}
          >
            Send Backward
          </button>

          <button
            type="button"
            onClick={() => moveSelectedLayer("forward")}
            disabled={!selectedObject}
            className={toolButton}
          >
            Bring Forward
          </button>

          <button
            type="button"
            onClick={toggleSelectedLock}
            disabled={!selectedObject}
            className={toolButton}
          >
            {selectedObject?.locked
              ? "Unlock Object"
              : "Lock Object"}
          </button>

          <button
            type="button"
            onClick={removeSelected}
            disabled={!selectedObject || selectedObject.locked}
            className={toolButton}
          >
            Remove Selected
          </button>
        </div>
      )}

      {/* Background controls */}
      {isEditing && (
        <div className="relative z-20 border-b border-purple-300/15 bg-[#171125] px-5 py-4">
          <div className="mx-auto max-w-6xl space-y-4">
            <div>
              <h2 className="text-base font-semibold text-purple-100">
                ✦ Zimmer Background
              </h2>
              <p className="mt-1 text-xs text-white/50">
                Replace the entire background without moving
                any of your Zimmer objects.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBackgroundMode("gradient")}
                className={toolButton}
              >
                Original Gradient
              </button>

              <button
                type="button"
                onClick={() => setBackgroundMode("color")}
                className={toolButton}
              >
                Solid Color
              </button>

              <button
                type="button"
                onClick={() => setBackgroundMode("gif")}
                className={toolButton}
              >
                ☾ Moving Lavender Clouds
              </button>
            </div>

            {room.background.type === "color" && (
              <label className="flex items-center gap-3 text-sm">
                Background color
                <input
                  type="color"
                  value={hexColor(room.background.color)}
                  onChange={(event) =>
                    setRoom((current) => ({
                      ...current,
                      background: {
                        ...current.background,
                        color: event.target.value,
                      },
                    }))
                  }
                  className="h-10 w-14 cursor-pointer rounded-lg"
                />
              </label>
            )}

            <div className="flex flex-wrap items-end gap-2">
              <label className="flex min-w-[220px] max-w-xl flex-1 flex-col gap-2 text-sm">
                Custom background image / GIF URL
                <input
                  type="text"
                  value={backgroundUrl}
                  onChange={(event) =>
                    setBackgroundUrl(event.target.value)
                  }
                  placeholder="/graphics/backgrounds/your-image.gif"
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white outline-none focus:border-purple-300"
                />
              </label>

              <button
                type="button"
                onClick={applyCustomBackground}
                className={toolButton}
              >
                Apply Background
              </button>
            </div>

            {backgroundError && (
              <p className="text-sm text-pink-300" role="alert">
                {backgroundError}
              </p>
            )}

            <p className="text-xs text-white/45">
              Background changes are local until backend saving
              is connected.
            </p>
          </div>
        </div>
      )}

      
<FloatingControl
  storageKey="scenes-zimmer-raindrop-position-v1"
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
        setEditorOpen(false);
        setIsEditing(false);
        setSelectedId(null);
      } else {
        setEditorOpen(true);
        setIsEditing(true);
      }
    }}
    className="flex h-12 w-12 cursor-grab items-center justify-center rounded-full border border-white/30 bg-[#201735]/80 text-xl shadow-xl backdrop-blur-xl transition hover:bg-purple-400/30 active:cursor-grabbing"
  >
    💧
  </button>
</FloatingControl>


      {editorOpen && (
        <ZimmerEditor
          selectedObject={selectedObject}
          background={room.background}
          onClose={() => {
            setEditorOpen(false);
            setIsEditing(false);
            setSelectedId(null);
          }}
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

      {/* Zimmer canvas */}
      <div
        ref={canvasRef}
        className={`zimmer-room relative mx-auto min-h-[800px] w-full max-w-[1200px] overflow-hidden ${
          isEditing ? "zimmer-editing" : ""
        }`}
        style={backgroundStyle}
        onClick={() => {
          if (isEditing) setSelectedId(null);
        }}
      >
        {room.objects.map((object) => (
          <ZimmerObjectRenderer
            key={object.id}
            object={object}
            selected={isEditing && selectedId === object.id}
            onSelect={isEditing ? setSelectedId : undefined}
          />
        ))}
      </div>

      {/* Drag / resize / rotate */}
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

              if (!element || !pendingTransform.current) return;

              const x =
                selectedObject.transform.x + beforeTranslate[0];
              const y =
                selectedObject.transform.y + beforeTranslate[1];

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

              if (!element || !pendingTransform.current) return;

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
              if (!selectedId || !lastEvent) return;

              const finalRotation = lastEvent.beforeRotate;

              setRoom((current) => ({
                ...current,
                objects: current.objects.map((object) =>
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

      {/* Object styling */}
      {isEditing && selectedObject && (
        <div className="relative z-20 border-t border-white/10 bg-[#171125] p-5">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-pink-100">
                ✦ Style Your Object
              </h3>
              <p className="text-sm text-white/50">
                Editing: {selectedObject.name}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-2 text-sm">
                Text Color
                <input
                  type="color"
                  disabled={selectedObject.locked}
                  value={hexColor(selectedObject.appearance.color)}
                  onChange={(event) =>
                    updateSelectedAppearance({
                      color: event.target.value,
                    })
                  }
                  className="h-10 w-full cursor-pointer rounded-lg"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Background Color
                <input
                  type="color"
                  disabled={selectedObject.locked}
                  value={hexColor(
                    selectedObject.appearance.backgroundColor
                  )}
                  onChange={(event) =>
                    updateSelectedAppearance({
                      backgroundColor: event.target.value,
                    })
                  }
                  className="h-10 w-full cursor-pointer rounded-lg"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Font Size
                <input
                  type="range"
                  min="12"
                  max="120"
                  disabled={selectedObject.locked}
                  value={selectedObject.appearance.fontSize}
                  onChange={(event) =>
                    updateSelectedAppearance({
                      fontSize: Number(event.target.value),
                    })
                  }
                />
                <span className="text-xs text-white/50">
                  {selectedObject.appearance.fontSize}px
                </span>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Opacity
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  disabled={selectedObject.locked}
                  value={selectedObject.appearance.opacity}
                  onChange={(event) =>
                    updateSelectedAppearance({
                      opacity: Number(event.target.value),
                    })
                  }
                />
                <span className="text-xs text-white/50">
                  {Math.round(
                    selectedObject.appearance.opacity * 100
                  )}%
                </span>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Font Family
                <select
                  disabled={selectedObject.locked}
                  value={selectedObject.appearance.fontFamily}
                  onChange={(event) =>
                    updateSelectedAppearance({
                      fontFamily: event.target.value,
                    })
                  }
                  className="rounded-lg border border-white/20 bg-[#241b3b] p-2 text-white"
                >
                  <option value="Arial, Helvetica, sans-serif">
                    Arial
                  </option>
                  <option value="Georgia, serif">
                    Georgia
                  </option>
                  <option value="'Times New Roman', serif">
                    Times New Roman
                  </option>
                  <option value="'Courier New', monospace">
                    Courier New
                  </option>
                  <option value="Verdana, sans-serif">
                    Verdana
                  </option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Font Weight
                <select
                  disabled={selectedObject.locked}
                  value={selectedObject.appearance.fontWeight}
                  onChange={(event) =>
                    updateSelectedAppearance({
                      fontWeight: Number(event.target.value),
                    })
                  }
                  className="rounded-lg border border-white/20 bg-[#241b3b] p-2 text-white"
                >
                  <option value={300}>Light</option>
                  <option value={400}>Regular</option>
                  <option value={500}>Medium</option>
                  <option value={600}>Semi Bold</option>
                  <option value={700}>Bold</option>
                  <option value={900}>Extra Bold</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Corner Roundness
                <input
                  type="range"
                  min="0"
                  max="60"
                  disabled={selectedObject.locked}
                  value={selectedObject.appearance.borderRadius}
                  onChange={(event) =>
                    updateSelectedAppearance({
                      borderRadius: Number(event.target.value),
                    })
                  }
                />
                <span className="text-xs text-white/50">
                  {selectedObject.appearance.borderRadius}px
                </span>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Blur
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  disabled={selectedObject.locked}
                  value={selectedObject.appearance.blur}
                  onChange={(event) =>
                    updateSelectedAppearance({
                      blur: Number(event.target.value),
                    })
                  }
                />
                <span className="text-xs text-white/50">
                  {selectedObject.appearance.blur}px
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Text editing */}
      {isEditing &&
        selectedObject &&
        (selectedObject.type === "text" ||
          selectedObject.type === "section") && (
          <div className="relative z-20 border-t border-white/10 bg-[#171125] p-4">
            <label
              htmlFor="zimmer-text-editor"
              className="mb-2 block text-sm font-semibold text-pink-200"
            >
              Edit: {selectedObject.name}
            </label>

            <textarea
              id="zimmer-text-editor"
              value={selectedObject.content ?? ""}
              disabled={selectedObject.locked}
              onChange={(event) =>
                updateSelectedContent(event.target.value)
              }
              rows={6}
              className="w-full max-w-xl resize-y rounded-xl border border-pink-300/30 bg-white/10 p-3 text-white outline-none focus:border-pink-300"
              placeholder="Write here..."
            />

            <p className="mt-2 text-xs text-white/50">
              {selectedObject.content?.length ?? 0} characters
            </p>
          </div>
        )}

      {/* Editor status */}
      {isEditing && (
        <div className="relative z-20 border-t border-white/10 bg-black/20 p-4 text-center text-xs text-white/50">
          {selectedObject
            ? `Selected: ${selectedObject.name} | Layer: ${selectedObject.transform.zIndex}`
            : "Select an object to edit it"}
        </div>
      )}
    </div>
  );
}
