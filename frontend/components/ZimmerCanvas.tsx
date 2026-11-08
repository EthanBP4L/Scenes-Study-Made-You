
"use client";

import { useRef, useState } from "react";
import Moveable from "react-moveable";
import { graphicsLibrary } from "../lib/graphicsLibrary";
import type { ZimmerDraft, ZimmerObject } from "../lib/zimmerTypes";
import { createDefaultZimmer, createZimmerObject } from "../lib/zimmerTypes";
import ZimmerObjectRenderer from "./ZimmerObjectRenderer";

function createDemoZimmer(): ZimmerDraft {
  const room = createDefaultZimmer();

  room.background = {
    ...room.background,
    type: "gradient",
    gradient:
      "radial-gradient(ellipse at 72% 20%, #654486 0%, #322451 36%, #18152f 72%, #0b1025 100%)",
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
    object.transform = { x, y, width, height, rotation, zIndex };
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
    object.transform = { x, y, width, height, rotation, zIndex };
    object.appearance = {
      ...object.appearance,
      backgroundColor: "transparent",
      borderWidth: 0,
      boxShadow: "none",
    };
    room.objects.push(object);
  }

  addTextBlock(
    "demo-eyebrow",
    "Intro Label",
    "✦  A LITTLE CORNER OF THE INTERNET  ✦",
    95, 80, 570, 36, 15, "#eecbf9", 4, 0, 700
  );

  addTextBlock(
    "title-1",
    "Zimmer Title",
    "MY UNIVERSE",
    80, 126, 780, 115, 76, "#ffe0f5", 8, -3, 900
  );

  addTextBlock(
    "demo-tagline",
    "Tagline",
    "dreaming in color  ·  creating without rules",
    113, 242, 660, 55, 23, "#e4d4ff", 7, -1
  );

  const about = createZimmerObject("about-1", "section", "About Me");
  about.content =
    "✿  ABOUT ME\n\nWelcome to my little universe. A place for big ideas, tiny joys, late-night dreams and everything that makes me, me. ♡";
  about.transform = {
    x: 110,
    y: 360,
    width: 465,
    height: 245,
    rotation: -2,
    zIndex: 6,
  };
  about.appearance = {
    ...about.appearance,
    backgroundColor: "rgba(255, 225, 250, 0.14)",
    borderColor: "#eac0fa",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 28,
    boxShadow: "0 18px 65px rgba(9, 5, 30, 0.34)",
    color: "#fff0ff",
    fontSize: 21,
  };
  room.objects.push(about);

  const moodboard = createZimmerObject(
    "demo-moodboard",
    "section",
    "Moodboard"
  );
  moodboard.content =
    "CURRENT OBSESSIONS  ✧\n\nmoonlight · music · old photos\nroses · art · midnight skies";
  moodboard.transform = {
    x: 645,
    y: 420,
    width: 390,
    height: 185,
    rotation: 3,
    zIndex: 5,
  };
  moodboard.appearance = {
    ...moodboard.appearance,
    backgroundColor: "rgba(22, 16, 53, 0.74)",
    borderColor: "#bba3ee",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 25,
    boxShadow: "0 16px 55px rgba(6, 3, 25, 0.4)",
    color: "#f3dfff",
    fontSize: 20,
  };
  room.objects.push(moodboard);

  addTextBlock(
    "demo-signoff",
    "Room Signoff",
    "made of daydreams  ✧  stay awhile",
    260, 670, 700, 46, 23, "#eacaff", 6, -2
  );

  addSticker(
    "demo-rose", "Pink Rose", "pink-rose.png",
    885, 105, 225, 225, 13, 4
  );
  addSticker(
    "demo-butterfly", "Purple Butterfly", "purple-butterfly.png",
    760, 265, 170, 170, -16, 9
  );
  addSticker(
    "demo-heart", "Chrome Heart", "chrome-heart.png",
    50, 285, 160, 160, -13, 8
  );
  addSticker(
    "demo-bow", "Pink Bow", "pink-bow.png",
    490, 565, 160, 150, 9, 9
  );
  addSticker(
    "demo-sparkle", "Silver Sparkle", "silver-sparkle.png",
    980, 355, 130, 130, 0, 7
  );
  addSticker(
    "demo-chain", "Silver Chain", "silver-chain.png",
    850, 620, 185, 125, -8, 3
  );

  return room;
}

type ObjectPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function ZimmerCanvas() {
  const [room, setRoom] = useState<ZimmerDraft>(createDemoZimmer);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedObject = room.objects.find(
    (object) => object.id === selectedId
  );

  const canvasRef = useRef<HTMLDivElement>(null);
  const pendingTransform = useRef<ObjectPosition | null>(null);

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
    if (!selectedObject || room.objects.length >= 100) return;

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

      const currentIndex = sorted.findIndex(
        (object) => object.id === selectedId
      );

      if (currentIndex === -1) return current;

      const targetIndex =
        direction === "forward"
          ? currentIndex + 1
          : currentIndex - 1;

      if (targetIndex < 0 || targetIndex >= sorted.length) {
        return current;
      }

      const [movingObject] = sorted.splice(currentIndex, 1);
      sorted.splice(targetIndex, 0, movingObject);

      const layerNumbers = new Map(
        sorted.map((object, index) => [object.id, index + 1])
      );

      return {
        ...current,
        objects: current.objects.map((object) => ({
          ...object,
          transform: {
            ...object.transform,
            zIndex:
              layerNumbers.get(object.id) ??
              object.transform.zIndex,
          },
        })),
      };
    });
  }

  function toggleSelectedVisibility() {
    if (!selectedId) return;

    setRoom((current) => ({
      ...current,
      objects: current.objects.map((object) =>
        object.id === selectedId
          ? { ...object, visible: !object.visible }
          : object
      ),
    }));
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
    if (!selectedId) return;

    setRoom((current) => ({
      ...current,
      objects: current.objects.filter(
        (object) => object.id !== selectedId
      ),
    }));

    setSelectedId(null);
  }

  function addText() {
    if (room.objects.length >= 100) return;

    const object = createZimmerObject(
      crypto.randomUUID(),
      "text",
      "New Text"
    );

    object.content = "Your text here";

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

    if (!sticker || room.objects.length >= 100) return;

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

  return (
    <div className="relative min-h-screen bg-[#080817] text-white">
      {/* Temporary editor toolbar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/20 p-4">
        <div>
          <h2 className="font-bold">Zimmer Canvas</h2>
          <p className="text-xs text-white/50">
            Data-driven room prototype
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addText}
            disabled={room.objects.length >= 100}
            className="rounded-full bg-white/15 px-4 py-2 text-sm hover:bg-white/25 disabled:opacity-40"
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
                disabled={room.objects.length >= 100}
                className="rounded-full bg-pink-400/20 px-3 py-2 text-sm text-pink-100 hover:bg-pink-400/30 disabled:opacity-40"
              >
                {asset.name}
              </button>
            ))}

          <button
            type="button"
            onClick={duplicateSelected}
            disabled={!selectedObject || room.objects.length >= 100}
            className="rounded-full bg-purple-400/20 px-4 py-2 text-sm hover:bg-purple-400/30 disabled:opacity-40"
          >
            Duplicate
          </button>

          <button
            type="button"
            onClick={() => moveSelectedLayer("backward")}
            disabled={!selectedObject}
            className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-40"
          >
            Send Backward
          </button>

          <button
            type="button"
            onClick={() => moveSelectedLayer("forward")}
            disabled={!selectedObject}
            className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-40"
          >
            Bring Forward
          </button>

          <button
            type="button"
            onClick={toggleSelectedVisibility}
            disabled={!selectedObject}
            className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-40"
          >
            {selectedObject?.visible ? "Hide Object" : "Show Object"}
          </button>

          <button
            type="button"
            onClick={toggleSelectedLock}
            disabled={!selectedObject}
            className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-40"
          >
            {selectedObject?.locked ? "Unlock Object" : "Lock Object"}
          </button>

          <button
            type="button"
            onClick={removeSelected}
            disabled={!selectedObject}
            className="rounded-full bg-pink-400/20 px-4 py-2 text-sm hover:bg-pink-400/30 disabled:opacity-40"
          >
            Remove Selected
          </button>
        </div>
      </div>

      {/* Zimmer room */}
      <div
        ref={canvasRef}
        className="relative mx-auto min-h-[800px] w-full max-w-[1200px] overflow-hidden"
        style={{
          background:
            room.background.type === "gradient"
              ? room.background.gradient
              : room.background.color,
        }}
        onClick={() => setSelectedId(null)}
      >
        {room.objects.map((object) => (
          <ZimmerObjectRenderer
            key={object.id}
            object={object}
            selected={selectedId === object.id}
            onSelect={setSelectedId}
          />
        ))}
      </div>

      {/* Drag, resize and rotate */}
      {selectedObject &&
        !selectedObject.locked &&
        selectedObject.visible && (
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

              element.style.transform = `rotate(${beforeRotate}deg)`;
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

      {/* Text editor */}
      {selectedObject &&
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
              maxLength={2000}
              onChange={(event) => {
                const newText = event.target.value;

                setRoom((current) => ({
                  ...current,
                  objects: current.objects.map((object) =>
                    object.id === selectedId
                      ? { ...object, content: newText }
                      : object
                  ),
                }));
              }}
              rows={3}
              className="w-full max-w-xl rounded-xl border border-pink-300/30 bg-white/10 p-3 text-white outline-none focus:border-pink-300"
              placeholder="Write something magical..."
            />

            <p className="mt-2 text-xs text-white/50">
              Changes appear immediately on your Zimmer.
            </p>
          </div>
        )}

      {/* Selection status */}
      <div className="relative z-20 border-t border-white/10 bg-black/20 p-4 text-center text-xs text-white/50">
        {selectedObject
          ? `Selected: ${selectedObject.name} | Layer: ${selectedObject.transform.zIndex}`
          : "Click an object to select it"}
      </div>
    </div>
  );
}
