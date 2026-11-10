
"use client";

import NavigationOrb from "./NavigationOrb";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import Moveable from "react-moveable";

import defaultZimmerPreset from "../lib/defaultZimmerPreset.json";
import { graphicsLibrary } from "../lib/graphicsLibrary";

import type {
  ZimmerDraft,
  ZimmerObject,
  ZimmerDocument,
} from "../lib/zimmerTypes";

import { createZimmerObject } from "../lib/zimmerTypes";
import {
  zimmerApi,
  ZimmerApiError,
} from "../lib/api/zimmerApi";

import ZimmerObjectRenderer from "./ZimmerObjectRenderer";
import FloatingControl from "./FloatingControl";
import ZimmerEditor from "./ZimmerEditor";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000"
).replace(/\/$/, "");

const ORIGINAL_GRADIENT =
  "radial-gradient(ellipse at 72% 18%, #6b4d8d 0%, #3a2959 38%, #18152f 72%, #0b1025 100%)";

const MAX_OBJECTS = 100;

type ObjectPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error";

type UploadStatus =
  | "idle"
  | "uploading"
  | "error";

type UploadTarget =
  | "object"
  | "background";

type ProfileUploadResponse = {
  user_id: number;
  username: string;
  bio: string | null;
  profile_picture: string | null;
  room_pictures: string[];
};

function safeMediaUrl(url: string): string | null {
  const trimmed = url.trim();

  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//")
  ) {
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

function resolveMediaUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;

  const safe = safeMediaUrl(url);

  if (!safe) return null;

  if (safe.startsWith("/uploads/")) {
    return `${API_BASE}${safe}`;
  }

  return safe;
}

function createDemoZimmer(): ZimmerDraft {
  return structuredClone(
    defaultZimmerPreset.room
  ) as ZimmerDraft;
}

function isSavedZimmer(
  value: ZimmerDraft | undefined
): value is ZimmerDocument {
  if (!value) return false;

  const candidate =
    value as Partial<ZimmerDocument>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.revision === "number" &&
    typeof candidate.ownerId === "number"
  );
}

function getNextZIndex(
  objects: ZimmerObject[]
): number {
  return (
    Math.max(
      0,
      ...objects.map(
        (object) => object.transform.zIndex
      )
    ) + 1
  );
}

function isGifFile(file: File): boolean {
  return (
    file.type === "image/gif" ||
    file.name.toLowerCase().endsWith(".gif")
  );
}

function getUploadErrorMessage(
  status: number,
  detail: unknown
): string {
  if (typeof detail === "string") {
    return detail;
  }

  if (status === 401) {
    return "Your session expired. Please log in again.";
  }

  if (status === 413) {
    return "The selected image is too large.";
  }

  return `Image upload failed (${status}).`;
}

async function uploadRoomImage(
  file: File
): Promise<string> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_BASE}/api/v1/users/me/profile/room-pictures`,
    {
      method: "POST",
      credentials: "include",
      body: formData,
    }
  );

  if (!response.ok) {
    let detail: unknown = null;

    try {
      const errorData = await response.json();
      detail = errorData.detail;
    } catch {
      // Use the default error message.
    }

    throw new Error(
      getUploadErrorMessage(
        response.status,
        detail
      )
    );
  }

  const data =
    (await response.json()) as ProfileUploadResponse;

  const uploadedPath =
    data.room_pictures?.at(-1);

  if (
    !uploadedPath ||
    !uploadedPath.startsWith("/uploads/rooms/")
  ) {
    throw new Error(
      "Upload completed, but the backend did not return a valid room image path."
    );
  }

  return uploadedPath;
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

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [editorOpen, setEditorOpen] =
    useState(false);

  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>("idle");

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [uploadStatus, setUploadStatus] =
    useState<UploadStatus>("idle");

  const [uploadError, setUploadError] =
    useState<string | null>(null);

  const [uploadTarget, setUploadTarget] =
    useState<UploadTarget>("object");

  const [revision, setRevision] =
    useState<number | null>(
      isSavedZimmer(initialRoom)
        ? initialRoom.revision
        : null
    );

  const canvasRef =
    useRef<HTMLDivElement>(null);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const pendingTransform =
    useRef<ObjectPosition | null>(null);

  const savingRef = useRef(false);
  const uploadingRef = useRef(false);

  const revisionRef = useRef(revision);
  const roomRef = useRef(room);

  const savingEnabled =
    isSavedZimmer(initialRoom);

  const selectedObject =
    room.objects.find(
      (object) => object.id === selectedId
    ) ?? null;

  const isEditing = editorOpen;

  const maxObjectsReached =
    room.objects.length >= MAX_OBJECTS;

  useEffect(() => {
    roomRef.current = room;

    if (!savingRef.current) {
      setSaveStatus("idle");
      setSaveError(null);
    }
  }, [room]);

  function closeEditor() {
    setEditorOpen(false);
    setSelectedId(null);
    pendingTransform.current = null;
  }

  async function saveRoom() {
    if (
      !savingEnabled ||
      savingRef.current ||
      uploadingRef.current
    ) {
      return;
    }

    savingRef.current = true;
    setSaveStatus("saving");
    setSaveError(null);

    const snapshot =
      structuredClone(roomRef.current);

    const snapshotJSON =
      JSON.stringify(snapshot);

    try {
      const saved = await zimmerApi.save(
        snapshot,
        revisionRef.current
      );

      revisionRef.current = saved.revision;
      setRevision(saved.revision);

      if (
        JSON.stringify(roomRef.current) ===
        snapshotJSON
      ) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("idle");
      }
    } catch (error) {
      let message =
        "Unable to save your room.";

      if (error instanceof ZimmerApiError) {
        if (error.status === 409) {
          message =
            "Your room changed elsewhere. Reload the page before saving again.";
        } else if (error.status === 422) {
          message =
            `Room validation failed: ${error.message}`;
        } else if (error.status === 401) {
          message =
            "Your session expired. Log in again before saving.";
        } else {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      setSaveError(message);
      setSaveStatus("error");
    } finally {
      savingRef.current = false;
    }
  }

  function openImagePicker(
    target: UploadTarget
  ) {
    if (!savingEnabled) {
      setUploadError(
        "Image uploads are available in your personal Zimmer."
      );
      return;
    }

    if (
      uploadingRef.current ||
      (target === "object" &&
        maxObjectsReached)
    ) {
      return;
    }

    setUploadTarget(target);
    setUploadError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  async function handleImageSelected(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file || uploadingRef.current) {
      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {
      setUploadError(
        "Please select an image file."
      );
      return;
    }

    if (
      uploadTarget === "object" &&
      roomRef.current.objects.length >=
        MAX_OBJECTS
    ) {
      setUploadError(
        "Your Zimmer has reached the 100-object limit."
      );
      return;
    }

    uploadingRef.current = true;
    setUploadStatus("uploading");
    setUploadError(null);

    try {
      const uploadedPath =
        await uploadRoomImage(file);

      if (uploadTarget === "background") {
        setRoom((current) => ({
          ...current,
          background: {
            ...current.background,
            type: isGifFile(file)
              ? "gif"
              : "image",
            mediaUrl: uploadedPath,
          },
        }));
      } else {
        const object = createZimmerObject(
          crypto.randomUUID(),
          isGifFile(file) ? "gif" : "image",
          file.name.slice(0, 100)
        );

        object.mediaUrl = uploadedPath;

        object.transform = {
          ...object.transform,
          x: 300,
          y: 180,
          width: 300,
          height: 240,
          rotation: 0,
          zIndex: getNextZIndex(
            roomRef.current.objects
          ),
        };

        object.appearance = {
          ...object.appearance,
          backgroundColor: "transparent",
          borderWidth: 0,
          boxShadow: "none",
        };

        setRoom((current) => ({
          ...current,
          objects: [
            ...current.objects,
            object,
          ],
        }));

        setSelectedId(object.id);
      }

      setUploadStatus("idle");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Unable to upload the image."
      );

      setUploadStatus("error");
    } finally {
      uploadingRef.current = false;

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        !isEditing ||
        !selectedId
      ) {
        return;
      }

      if (
        event.key !== "Delete" &&
        event.key !== "Backspace"
      ) {
        return;
      }

      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        target.closest(
          "input, textarea, select, [contenteditable]"
        )
      ) {
        return;
      }

      const selected =
        room.objects.find(
          (object) =>
            object.id === selectedId
        );

      if (
        !selected ||
        selected.locked
      ) {
        return;
      }

      event.preventDefault();

      setRoom((current) => ({
        ...current,
        objects:
          current.objects.filter(
            (object) =>
              object.id !== selectedId
          ),
      }));

      setSelectedId(null);
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isEditing,
    selectedId,
    room.objects,
  ]);

  function getSelectedElement():
    HTMLElement | null {
    if (
      !selectedId ||
      !canvasRef.current
    ) {
      return null;
    }

    const elements =
      canvasRef.current.querySelectorAll<HTMLElement>(
        "[data-zimmer-object-id]"
      );

    return (
      Array.from(elements).find(
        (element) =>
          element.dataset.zimmerObjectId ===
          selectedId
      ) ?? null
    );
  }

  function saveTransform() {
    if (
      !selectedId ||
      !pendingTransform.current
    ) {
      return;
    }

    const finalTransform =
      pendingTransform.current;

    setRoom((current) => ({
      ...current,
      objects: current.objects.map(
        (object) =>
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
    if (
      !selectedObject ||
      maxObjectsReached
    ) {
      return;
    }

    const copy: ZimmerObject = {
      ...selectedObject,
      id: crypto.randomUUID(),
      name:
        `${selectedObject.name} Copy`.slice(
          0,
          100
        ),
      transform: {
        ...selectedObject.transform,
        x:
          selectedObject.transform.x + 30,
        y:
          selectedObject.transform.y + 30,
        zIndex: getNextZIndex(
          room.objects
        ),
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
      objects: [
        ...current.objects,
        copy,
      ],
    }));

    setSelectedId(copy.id);
  }

  function moveSelectedLayer(
    direction: "forward" | "backward"
  ) {
    if (!selectedId) return;

    setRoom((current) => {
      const sorted = [
        ...current.objects,
      ].sort(
        (a, b) =>
          a.transform.zIndex -
          b.transform.zIndex
      );

      const selectedIndex =
        sorted.findIndex(
          (object) =>
            object.id === selectedId
        );

      if (selectedIndex === -1) {
        return current;
      }

      const [selected] =
        sorted.splice(
          selectedIndex,
          1
        );

      if (direction === "forward") {
        sorted.push(selected);
      } else {
        sorted.unshift(selected);
      }

      return {
        ...current,
        objects: sorted.map(
          (object, index) => ({
            ...object,
            transform: {
              ...object.transform,
              zIndex: index + 1,
            },
          })
        ),
      };
    });
  }

  function toggleSelectedLock() {
    if (!selectedId) return;

    setRoom((current) => ({
      ...current,
      objects: current.objects.map(
        (object) =>
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
    if (
      !selectedId ||
      selectedObject?.locked
    ) {
      return;
    }

    setRoom((current) => ({
      ...current,
      objects:
        current.objects.filter(
          (object) =>
            object.id !== selectedId
        ),
    }));

    setSelectedId(null);
  }

  function addText() {
    if (maxObjectsReached) return;

    const object =
      createZimmerObject(
        crypto.randomUUID(),
        "text",
        "New Text"
      );

    object.content =
      "Your text here";

    object.transform.zIndex =
      getNextZIndex(room.objects);

    setRoom((current) => ({
      ...current,
      objects: [
        ...current.objects,
        object,
      ],
    }));

    setSelectedId(object.id);
  }

  function addSticker(
    assetId: string
  ) {
    const sticker =
      graphicsLibrary.find(
        (asset) =>
          asset.id === assetId &&
          asset.category === "stickers"
      );

    if (
      !sticker ||
      maxObjectsReached
    ) {
      return;
    }

    const object =
      createZimmerObject(
        crypto.randomUUID(),
        "sticker",
        sticker.name
      );

    object.mediaUrl =
      sticker.src;

    object.transform = {
      ...object.transform,
      x: 300,
      y: 180,
      width: 220,
      height: 220,
      zIndex: getNextZIndex(
        room.objects
      ),
    };

    object.appearance = {
      ...object.appearance,
      backgroundColor: "transparent",
      borderWidth: 0,
      boxShadow: "none",
    };

    setRoom((current) => ({
      ...current,
      objects: [
        ...current.objects,
        object,
      ],
    }));

    setSelectedId(object.id);
  }

  function addGifFromUrl(
    url: string
  ) {
    const safeUrl =
      safeMediaUrl(url);

    if (
      !safeUrl ||
      maxObjectsReached
    ) {
      return;
    }

    const object =
      createZimmerObject(
        crypto.randomUUID(),
        "gif",
        "GIF"
      );

    object.mediaUrl =
      safeUrl;

    object.transform = {
      x: 580,
      y: 335,
      width: 250,
      height: 200,
      rotation: 0,
      zIndex: getNextZIndex(
        room.objects
      ),
    };

    object.appearance = {
      ...object.appearance,
      backgroundColor: "transparent",
      borderWidth: 0,
      borderRadius: 22,
      boxShadow:
        "0 12px 45px rgba(0,0,0,0.3)",
    };

    setRoom((current) => ({
      ...current,
      objects: [
        ...current.objects,
        object,
      ],
    }));

    setSelectedId(object.id);
  }

  function setEditorBackground(
    type:
      | "gradient"
      | "color"
      | "image"
      | "gif",
    value?: string
  ) {
    if (
      (type === "gif" ||
        type === "image") &&
      (!value ||
        !safeMediaUrl(value))
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
            ? value ??
              current.background.color
            : current.background.color,
        gradient:
          type === "gradient"
            ? value ??
              ORIGINAL_GRADIENT
            : current.background.gradient,
        mediaUrl:
          type === "gif" ||
          type === "image"
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
      objects: current.objects.map(
        (object) =>
          object.id === selectedId &&
          !object.locked
            ? {
                ...object,
                ...changes,
                id: object.id,
                locked: object.locked,
                transform:
                  object.transform,
              }
            : object
      ),
    }));
  }

  async function copyZimmerLayout() {
    const exportData = {
      presetName:
        `SCENES Default ${pageName}`,
      presetVersion: 1,
      canvas: {
        width: 1200,
        height: 1000,
      },
      room: {
        ...room,
        objects: room.objects.map(
          (object) => ({
            ...object,
            transform: {
              ...object.transform,
            },
            appearance: {
              ...object.appearance,
            },
            animation: {
              ...object.animation,
            },
          })
        ),
      },
    };

    const json =
      JSON.stringify(
        exportData,
        null,
        2
      );

    try {
      await navigator.clipboard.writeText(
        json
      );

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

  const backgroundMedia =
    resolveMediaUrl(
      room.background.mediaUrl
    );

  const backgroundStyle:
    CSSProperties = {
      backgroundColor:
        room.background.color,
      backgroundImage:
        room.background.type ===
        "gradient"
          ? room.background.gradient
          : (
              room.background.type ===
                "gif" ||
              room.background.type ===
                "image"
            ) &&
            backgroundMedia
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelected}
        aria-label="Upload Zimmer image"
      />

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

      {editorOpen && savingEnabled && (
        <div className="fixed bottom-20 right-5 z-[100] flex max-w-[280px] flex-col gap-2">
          <div className="rounded-2xl border border-purple-300/30 bg-[#24183B]/95 p-3 shadow-xl backdrop-blur-xl">
            <p className="mb-3 text-sm font-bold text-pink-100">
              ✦ Your Images
            </p>

            <button
              type="button"
              disabled={
                uploadStatus ===
                  "uploading" ||
                maxObjectsReached
              }
              onClick={() =>
                openImagePicker("object")
              }
              className="mb-2 w-full rounded-xl border border-purple-300/30 bg-purple-500/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Upload Image to Canvas
            </button>

            <button
              type="button"
              disabled={
                uploadStatus ===
                "uploading"
              }
              onClick={() =>
                openImagePicker(
                  "background"
                )
              }
              className="w-full rounded-xl border border-purple-300/30 bg-purple-500/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ✦ Upload Room Background
            </button>

            {uploadStatus ===
              "uploading" && (
              <p className="mt-3 text-xs text-purple-200">
                Uploading image...
              </p>
            )}

            {uploadError && (
              <p
                role="alert"
                className="mt-3 text-xs text-red-300"
              >
                {uploadError}
              </p>
            )}

            <p className="mt-3 text-xs text-purple-200/70">
              Uploaded images are stored
              securely under your account.
              Click Save Room to keep your
              changes.
            </p>
          </div>
        </div>
      )}

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
            (asset) =>
              asset.category ===
              "stickers"
          )}
          onAddSticker={addSticker}
          onAddGif={addGifFromUrl}
          onSetBackground={
            setEditorBackground
          }
          onUpdateObject={
            updateSelectedObject
          }
          onDuplicate={
            duplicateSelected
          }
          onDelete={removeSelected}
          onBringForward={() =>
            moveSelectedLayer(
              "forward"
            )
          }
          onSendBackward={() =>
            moveSelectedLayer(
              "backward"
            )
          }
          onToggleLock={
            toggleSelectedLock
          }
          onSave={
            savingEnabled
              ? saveRoom
              : undefined
          }
          saveStatus={saveStatus}
          saveError={saveError}
        />
      )}

      <div
        ref={canvasRef}
        className={`zimmer-room relative mx-auto min-h-[1000px] w-full max-w-[1200px] overflow-hidden rounded-[6px] ring-1 ring-purple-300/10 ${
          isEditing
            ? "zimmer-editing"
            : ""
        }`}
        style={backgroundStyle}
        onClick={() => {
          if (isEditing) {
            setSelectedId(null);
          }
        }}
      >
        {room.objects.map(
          (object) => {
            const renderedObject: ZimmerObject =
              {
                ...object,
                mediaUrl:
                  object.mediaUrl
                    ? resolveMediaUrl(
                        object.mediaUrl
                      ) ??
                      object.mediaUrl
                    : object.mediaUrl,
                appearance: {
                  ...object.appearance,
                  backgroundImage:
                    object.appearance
                      .backgroundImage
                      ? resolveMediaUrl(
                          object.appearance
                            .backgroundImage
                        ) ??
                        object.appearance
                          .backgroundImage
                      : object.appearance
                          .backgroundImage,
                },
              };

            return (
              <ZimmerObjectRenderer
                key={object.id}
                object={
                  renderedObject
                }
                selected={
                  isEditing &&
                  selectedId ===
                    object.id
                }
                onSelect={
                  isEditing
                    ? setSelectedId
                    : undefined
                }
              />
            );
          }
        )}
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
              pendingTransform.current =
                {
                  x:
                    selectedObject
                      .transform.x,
                  y:
                    selectedObject
                      .transform.y,
                  width:
                    selectedObject
                      .transform.width,
                  height:
                    selectedObject
                      .transform.height,
                };
            }}
            onDrag={({
              beforeTranslate,
            }) => {
              const element =
                getSelectedElement();

              if (
                !element ||
                !pendingTransform.current
              ) {
                return;
              }

              const x =
                selectedObject
                  .transform.x +
                beforeTranslate[0];

              const y =
                selectedObject
                  .transform.y +
                beforeTranslate[1];

              pendingTransform.current =
                {
                  ...pendingTransform.current,
                  x,
                  y,
                };

              element.style.left =
                `${x}px`;

              element.style.top =
                `${y}px`;
            }}
            onDragEnd={saveTransform}
            onResizeStart={() => {
              pendingTransform.current =
                {
                  x:
                    selectedObject
                      .transform.x,
                  y:
                    selectedObject
                      .transform.y,
                  width:
                    selectedObject
                      .transform.width,
                  height:
                    selectedObject
                      .transform.height,
                };
            }}
            onResize={({
              width,
              height,
              drag,
            }) => {
              const element =
                getSelectedElement();

              if (
                !element ||
                !pendingTransform.current
              ) {
                return;
              }

              const x =
                selectedObject
                  .transform.x +
                drag.beforeTranslate[0];

              const y =
                selectedObject
                  .transform.y +
                drag.beforeTranslate[1];

              pendingTransform.current =
                {
                  x,
                  y,
                  width,
                  height,
                };

              element.style.left =
                `${x}px`;

              element.style.top =
                `${y}px`;

              element.style.width =
                `${width}px`;

              element.style.height =
                `${height}px`;
            }}
            onResizeEnd={
              saveTransform
            }
            onRotate={({
              beforeRotate,
            }) => {
              const element =
                getSelectedElement();

              if (!element) return;

              element.style.transform =
                `rotate(${beforeRotate}deg)`;
            }}
            onRotateEnd={({
              lastEvent,
            }) => {
              if (
                !selectedId ||
                !lastEvent
              ) {
                return;
              }

              const finalRotation =
                lastEvent.beforeRotate;

              setRoom((current) => ({
                ...current,
                objects:
                  current.objects.map(
                    (object) =>
                      object.id ===
                      selectedId
                        ? {
                            ...object,
                            transform:
                              {
                                ...object.transform,
                                rotation:
                                  finalRotation,
                              },
                          }
                        : object
                  ),
              }));
            }}
          />
        )}

      {showNavigation && (
        <NavigationOrb />
      )}
    </div>
  );
}
