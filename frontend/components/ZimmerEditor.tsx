
"use client";

import { useEffect, useState } from "react";
import FloatingEditor from "./FloatingEditor";

import type {
  ZimmerBackground,
  ZimmerObject,
} from "../lib/zimmerTypes";

type EditorTab = "add" | "background" | "object";

type StickerAsset = {
  id: string;
  name: string;
  src: string;
};

type Props = {
  pageName?: string;
  launcherId?: string;
  editorStorageKey?: string;

  selectedObject: ZimmerObject | null;
  background: ZimmerBackground;
  onClose: () => void;

  onAddText: () => void;
  stickers: StickerAsset[];
  onAddSticker: (assetId: string) => void;
  onAddGif: (url: string) => void;

  onSetBackground: (
    type: "gradient" | "color" | "image" | "gif",
    value?: string
  ) => void;

  onUpdateObject: (
    changes: Partial<ZimmerObject>
  ) => void;

  onDuplicate: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onToggleLock: () => void;
};

const DEFAULT_GIF =
  "/graphics/backgrounds/lavender-clouds-v2.gif";

const ORIGINAL_GRADIENT =
  "radial-gradient(ellipse at 72% 18%, #6b4d8d 0%, #3a2959 38%, #18152f 72%, #0b1025 100%)";

const fieldClass =
  "mt-1 w-full rounded-xl border border-white/20 bg-white/10 p-2 text-sm text-white outline-none focus:border-purple-300";

const buttonClass =
  "rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20";

const sectionClass =
  "space-y-3 rounded-2xl border border-white/15 bg-white/5 p-3";

function validMediaUrl(value: string): boolean {
  const url = value.trim();

  if (url.startsWith("/") && !url.startsWith("//")) {
    return true;
  }

  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    );
  } catch {
    return false;
  }
}

function colorForInput(
  value: string,
  fallback: string
): string {
  return /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback;
}

export default function ZimmerEditor({
  pageName = "Zimmer",
  launcherId = "zimmer-edit-raindrop",
  editorStorageKey = "scenes-zimmer-editor-position-v1",
  selectedObject,
  background,
  onClose,
  onAddText,
  stickers,
  onAddSticker,
  onAddGif,
  onSetBackground,
  onUpdateObject,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
  onToggleLock,
}: Props) {
  const [tab, setTab] = useState<EditorTab>("add");

  const [gifUrl, setGifUrl] = useState(DEFAULT_GIF);

  const [backgroundGifUrl, setBackgroundGifUrl] =
    useState(DEFAULT_GIF);

  const [imageUrl, setImageUrl] = useState("");

  const [backgroundColor, setBackgroundColor] =
    useState("#24183e");

  const [error, setError] = useState("");

  const appearance = selectedObject?.appearance;
  const isLocked = selectedObject?.locked ?? false;

  useEffect(() => {
    if (selectedObject) {
      setTab("object");
    }
  }, [selectedObject?.id]);

  function addGif() {
    if (!validMediaUrl(gifUrl)) {
      setError("Enter a valid GIF URL or local asset path.");
      return;
    }

    setError("");
    onAddGif(gifUrl.trim());
  }

  function applyGifBackground() {
    if (!validMediaUrl(backgroundGifUrl)) {
      setError("Enter a valid GIF background URL.");
      return;
    }

    setError("");
    onSetBackground("gif", backgroundGifUrl.trim());
  }

  function applyImageBackground() {
    if (!validMediaUrl(imageUrl)) {
      setError("Enter a valid image URL.");
      return;
    }

    setError("");
    onSetBackground("image", imageUrl.trim());
  }

  function updateAppearance(
    changes: Partial<ZimmerObject["appearance"]>
  ) {
    if (!selectedObject || isLocked) return;

    onUpdateObject({
      appearance: {
        ...selectedObject.appearance,
        ...changes,
      },
    });
  }

  function updateContent(value: string) {
    if (!selectedObject || isLocked) return;

    onUpdateObject({
      content: value,
    });
  }

  return (
    <FloatingEditor
      launcherId={launcherId}
      storageKey={editorStorageKey}
      ariaLabel={`${pageName} customization editor`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {/* Header */}
        <div
          data-panel-drag-handle
          className="mb-3 flex cursor-grab touch-none items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 active:cursor-grabbing"
        >
          <div>
            <h2 className="text-lg font-bold">
              Customize {pageName}
            </h2>

            <p className="text-xs text-purple-200/70">
              Make this space yours.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${pageName} editor`}
            className="rounded-full px-3 py-1 hover:bg-white/15"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          {(
            [
              ["add", "＋ Add"],
              ["background", "◈ Room"],
              ["object", "✦ Object"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTab(value);
                setError("");
              }}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
                tab === value
                  ? "bg-purple-400/30 ring-1 ring-purple-200/60"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-rose-300/30 bg-rose-400/10 p-3 text-xs text-rose-100"
          >
            {error}
          </p>
        )}

        {/* ADD TAB */}
        {tab === "add" && (
          <div className="space-y-4">
            <section className={sectionClass}>
              <h3 className="text-sm font-semibold">
                Add an element
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onAddText}
                  className={buttonClass}
                >
                  T Add Text
                </button>

                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById(
                        "zimmer-sticker-gallery"
                      )
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      });
                  }}
                  className={buttonClass}
                >
                  ✿ Browse Stickers
                </button>
              </div>
            </section>

            {/* Sticker gallery */}
            <section
              id="zimmer-sticker-gallery"
              className={sectionClass}
            >
              <h3 className="text-sm font-semibold">
                ✿ Sticker Gallery
              </h3>

              <p className="text-xs text-white/60">
                Click a sticker to add it. You can move,
                resize, rotate, and layer it afterward.
              </p>

              {stickers.length === 0 ? (
                <p className="rounded-xl bg-white/5 p-3 text-xs text-white/50">
                  No stickers are available yet.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {stickers.map((sticker) => (
                    <button
                      key={sticker.id}
                      type="button"
                      title={sticker.name}
                      aria-label={`Add ${sticker.name}`}
                      onClick={() =>
                        onAddSticker(sticker.id)
                      }
                      className="group flex flex-col items-center gap-2 rounded-xl border border-white/15 bg-white/5 p-2 transition hover:border-purple-300/70 hover:bg-purple-400/15"
                    >
                      <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-black/20">
                        <img
                          src={sticker.src}
                          alt=""
                          draggable={false}
                          className="h-full w-full object-contain transition-transform group-hover:scale-110"
                        />
                      </div>

                      <span className="w-full truncate text-center text-[10px] text-purple-100">
                        {sticker.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* GIF */}
            <section className={sectionClass}>
              <h3 className="text-sm font-semibold">
                Add GIF
              </h3>

              <p className="text-xs text-white/60">
                Add an animated GIF as a movable object.
              </p>

              <div className="overflow-hidden rounded-xl border border-white/20 bg-black/20">
                <img
                  src={DEFAULT_GIF}
                  alt="Lavender clouds GIF preview"
                  className="h-32 w-full object-cover"
                />

                <div className="p-2 text-xs text-white/75">
                  Lavender Clouds — demo asset
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGifUrl(DEFAULT_GIF)}
                className={buttonClass}
              >
                Select demo GIF
              </button>

              <label className="block text-xs">
                Or enter another GIF URL

                <input
                  type="text"
                  value={gifUrl}
                  onChange={(event) =>
                    setGifUrl(event.target.value)
                  }
                  placeholder="/graphics/backgrounds/example.gif"
                  className={fieldClass}
                />
              </label>

              <button
                type="button"
                onClick={addGif}
                className="w-full rounded-xl bg-purple-400/30 px-3 py-3 text-sm font-bold transition hover:bg-purple-400/40"
              >
                ＋ Add Selected GIF
              </button>
            </section>
          </div>
        )}

        {/* BACKGROUND TAB */}
        {tab === "background" && (
          <div className="space-y-4">
            <section className={sectionClass}>
              <h3 className="text-sm font-semibold">
                Page background
              </h3>

              <p className="text-xs text-white/60">
                Current mode: {background.type}
              </p>

              <button
                type="button"
                onClick={() =>
                  onSetBackground(
                    "gradient",
                    ORIGINAL_GRADIENT
                  )
                }
                className={`${buttonClass} w-full`}
              >
                ✦ Restore Original Gradient
              </button>

              <label className="block text-xs">
                Solid background color

                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(event) =>
                    setBackgroundColor(event.target.value)
                  }
                  className="mt-2 h-10 w-full cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  onSetBackground(
                    "color",
                    backgroundColor
                  )
                }
                className={`${buttonClass} w-full`}
              >
                Apply Solid Color
              </button>
            </section>

            <section className={sectionClass}>
              <h3 className="text-sm font-semibold">
                Animated GIF background
              </h3>

              <p className="text-xs text-white/60">
                Fill the page with an animated GIF.
                This does not create a movable object.
              </p>

              <div className="overflow-hidden rounded-xl border border-white/20">
                <img
                  src={DEFAULT_GIF}
                  alt="Animated background preview"
                  className="h-32 w-full object-cover"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setBackgroundGifUrl(DEFAULT_GIF)
                }
                className={buttonClass}
              >
                Select demo GIF
              </button>

              <label className="block text-xs">
                GIF URL

                <input
                  type="text"
                  value={backgroundGifUrl}
                  onChange={(event) =>
                    setBackgroundGifUrl(event.target.value)
                  }
                  className={fieldClass}
                />
              </label>

              <button
                type="button"
                onClick={applyGifBackground}
                className="w-full rounded-xl bg-purple-400/30 px-3 py-3 text-sm font-bold transition hover:bg-purple-400/40"
              >
                Apply GIF Background
              </button>
            </section>

            <section className={sectionClass}>
              <h3 className="text-sm font-semibold">
                Image background
              </h3>

              <label className="block text-xs">
                Image URL

                <input
                  type="text"
                  value={imageUrl}
                  onChange={(event) =>
                    setImageUrl(event.target.value)
                  }
                  placeholder="/graphics/backgrounds/image.png"
                  className={fieldClass}
                />
              </label>

              <button
                type="button"
                onClick={applyImageBackground}
                className={`${buttonClass} w-full`}
              >
                Apply Image Background
              </button>
            </section>
          </div>
        )}

        {/* OBJECT TAB */}
        {tab === "object" && (
          <div className="space-y-4">
            {!selectedObject ? (
              <section className={sectionClass}>
                <p className="text-sm font-semibold">
                  No object selected
                </p>

                <p className="text-xs text-white/60">
                  Click an object on the page to edit its
                  appearance and layers.
                </p>
              </section>
            ) : (
              <>
                <section className={sectionClass}>
                  <h3 className="text-sm font-semibold">
                    {selectedObject.name}
                  </h3>

                  <p className="text-xs text-white/60">
                    Type: {selectedObject.type}
                  </p>

                  <button
                    type="button"
                    onClick={onToggleLock}
                    className={`${buttonClass} w-full`}
                  >
                    {isLocked
                      ? "🔒 Unlock Object"
                      : "🔓 Lock Object"}
                  </button>
                </section>

                {!isLocked && (
                  <>
                    {/* Text controls */}
                    {(
                      selectedObject.type === "text" ||
                      selectedObject.type === "section" ||
                      selectedObject.type === "decoration"
                    ) && (
                      <section className={sectionClass}>
                        <h3 className="text-sm font-semibold">
                          Text
                        </h3>

                        <textarea
                          value={
                            selectedObject.content ?? ""
                          }
                          onChange={(event) =>
                            updateContent(
                              event.target.value
                            )
                          }
                          rows={5}
                          className={fieldClass}
                        />

                        <label className="block text-xs">
                          Font size:{" "}
                          {appearance?.fontSize ?? 24}px

                          <input
                            type="range"
                            min="10"
                            max="120"
                            value={
                              appearance?.fontSize ?? 24
                            }
                            onChange={(event) =>
                              updateAppearance({
                                fontSize: Number(
                                  event.target.value
                                ),
                              })
                            }
                            className="mt-2 w-full"
                          />
                        </label>

                        <label className="block text-xs">
                          Text color

                          <input
                            type="color"
                            value={colorForInput(
                              appearance?.color ?? "",
                              "#ffffff"
                            )}
                            onChange={(event) =>
                              updateAppearance({
                                color:
                                  event.target.value,
                              })
                            }
                            className="mt-2 h-10 w-full"
                          />
                        </label>
                      </section>
                    )}

                    {/* Appearance controls */}
                    <section className={sectionClass}>
                      <h3 className="text-sm font-semibold">
                        Appearance
                      </h3>

                      <label className="block text-xs">
                        Opacity:{" "}
                        {Math.round(
                          (appearance?.opacity ?? 1) *
                            100
                        )}
                        %

                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(
                            (appearance?.opacity ?? 1) *
                              100
                          )}
                          onChange={(event) =>
                            updateAppearance({
                              opacity:
                                Number(
                                  event.target.value
                                ) / 100,
                            })
                          }
                          className="mt-2 w-full"
                        />
                      </label>

                      <label className="block text-xs">
                        Corner radius:{" "}
                        {appearance?.borderRadius ?? 0}px

                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={
                            appearance?.borderRadius ?? 0
                          }
                          onChange={(event) =>
                            updateAppearance({
                              borderRadius: Number(
                                event.target.value
                              ),
                            })
                          }
                          className="mt-2 w-full"
                        />
                      </label>

                      <label className="block text-xs">
                        Border width:{" "}
                        {appearance?.borderWidth ?? 0}px

                        <input
                          type="range"
                          min="0"
                          max="12"
                          value={
                            appearance?.borderWidth ?? 0
                          }
                          onChange={(event) =>
                            updateAppearance({
                              borderWidth: Number(
                                event.target.value
                              ),
                              borderStyle: "solid",
                            })
                          }
                          className="mt-2 w-full"
                        />
                      </label>

                      <label className="block text-xs">
                        Border color

                        <input
                          type="color"
                          value={colorForInput(
                            appearance?.borderColor ?? "",
                            "#ffffff"
                          )}
                          onChange={(event) =>
                            updateAppearance({
                              borderColor:
                                event.target.value,
                            })
                          }
                          className="mt-2 h-10 w-full"
                        />
                      </label>
                    </section>

                    {/* Layer controls */}
                    <section className={sectionClass}>
                      <h3 className="text-sm font-semibold">
                        Layers and actions
                      </h3>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={onBringForward}
                          className={buttonClass}
                        >
                          ↑ Forward
                        </button>

                        <button
                          type="button"
                          onClick={onSendBackward}
                          className={buttonClass}
                        >
                          ↓ Backward
                        </button>

                        <button
                          type="button"
                          onClick={onDuplicate}
                          className={buttonClass}
                        >
                          Duplicate
                        </button>

                        <button
                          type="button"
                          onClick={onDelete}
                          className={`${buttonClass} border-rose-300/30 text-rose-100`}
                        >
                          Delete
                        </button>
                      </div>
                    </section>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </FloatingEditor>
  );
}
