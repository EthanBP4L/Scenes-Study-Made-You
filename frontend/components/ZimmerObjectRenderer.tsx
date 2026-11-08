
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

  const isText = object.type === "text";
  const isSection = object.type === "section";

  const isMedia =
    object.type === "image" ||
    object.type === "gif" ||
    object.type === "sticker";

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

  function renderContent() {
    switch (object.type) {
      case "text":
        return (
          <div
            className="flex h-full w-full items-center whitespace-pre-line px-2"
            style={{
              lineHeight: 1.12,
              letterSpacing:
                appearance.fontSize >= 50 ? "-0.045em" : "normal",
            }}
          >
            {object.content}
          </div>
        );

      case "section":
        return (
          <div
            className="h-full w-full whitespace-pre-line p-6"
            style={{
              lineHeight: 1.55,
            }}
          >
            {object.content}
          </div>
        );

      case "decoration":
        return (
          <div className="flex h-full w-full items-center justify-center whitespace-pre-line p-2 text-center">
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
            className={
              object.type === "sticker"
                ? "pointer-events-none h-full w-full select-none object-contain"
                : "pointer-events-none h-full w-full select-none object-cover"
            }
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
            className="pointer-events-none h-full w-full object-cover"
          />
        ) : null;

      case "shape":
        return null;

      case "study-sets":
        return (
          <div className="flex h-full w-full flex-col justify-center rounded-xl bg-white/10 p-4">
            <h3 className="text-lg font-semibold text-white">
              My Study Sets
            </h3>

            <p className="mt-2 text-sm text-white/70">
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
      data-zimmer-object-type={object.type}
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
