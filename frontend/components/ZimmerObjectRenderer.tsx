
"use client";

import type { CSSProperties } from "react";

import type { ZimmerObject } from "../lib/zimmerTypes";

import { renderSceneAnimation } from "../lib/sceneAnimationRenderer";

type Props = {
  object: ZimmerObject;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

export default function ZimmerObjectRenderer({
  object,
  selected = false,
  onSelect,
}: Props) {
  if (!object.visible) return null;

  const { transform, appearance } = object;

  // All visual properties come from object data.
  const objectStyle: CSSProperties = {
    position: "absolute",

    left: transform.x,
    top: transform.y,

    width: transform.width,
    height: transform.height,

    zIndex: transform.zIndex,

    transform: `rotate(${transform.rotation}deg)`,

    opacity: appearance.opacity,

    backgroundColor: appearance.backgroundColor,

    borderColor: appearance.borderColor,
    borderWidth: appearance.borderWidth,
    borderRadius: appearance.borderRadius,
    borderStyle: appearance.borderStyle,

    boxShadow: appearance.boxShadow,

    filter: `blur(${appearance.blur}px)`,

    color: appearance.color,
    fontFamily: appearance.fontFamily,
    fontSize: appearance.fontSize,
    fontWeight: appearance.fontWeight,

    overflow: "hidden",
    overflowWrap: "anywhere",

    outline: selected ? "2px solid #e9b6ff" : "none",
    outlineOffset: 4,

    cursor: object.locked ? "default" : "pointer",
  };

  // Decide what the object displays.
  function renderContent() {
    switch (object.type) {
      case "text":
      case "section":
      case "decoration":
        return (
          <div className="h-full w-full p-2">
            {object.content}
          </div>
        );

      case "image":
      case "gif":
      case "sticker":
        return object.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={object.mediaUrl}
            alt={object.name}
            draggable={false}
            className="h-full w-full object-contain"
          />
        ) : null;

      case "video":
        return object.mediaUrl ? (
          <video
            src={object.mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
        ) : null;

      case "shape":
        return null;

      case "study-sets":
        return (
          <div className="h-full w-full rounded-xl bg-white/10 p-4">
            <h3 className="text-lg font-semibold">
              My Study Sets
            </h3>

            <p className="mt-2 text-sm opacity-70">
              Study-set widget placeholder
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div
      data-zimmer-object-id={object.id}
      style={objectStyle}
      
onClick={(event) => {
  event.stopPropagation();
  
onSelect?.(object.id);

}}

    >
      <div
        className={
          object.animation
            ? "scene-animated h-full w-full"
            : "h-full w-full"
        }
        style={
          object.animation
            ? renderSceneAnimation(object.animation)
            : undefined
        }
      >
        {renderContent()}
      </div>
    </div>
  );
}
