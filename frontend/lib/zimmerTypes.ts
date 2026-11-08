
import {
  defaultSceneAnimation,
} from "./sceneAnimations";

import type {
  SceneAnimation,
} from "./sceneAnimations";

export type ZimmerObjectType =
  | "text"
  | "image"
  | "gif"
  | "video"
  | "shape"
  | "sticker"
  | "section"
  | "study-sets"
  | "decoration";

export type ZimmerTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
};

export type ZimmerAppearance = {
  opacity: number;
  backgroundColor: string;
  backgroundImage?: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  borderStyle: "none" | "solid" | "dashed" | "dotted";
  boxShadow: string;
  blur: number;
  color: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
};

export type ZimmerObject = {
  id: string;
  type: ZimmerObjectType;
  name: string;
  visible: boolean;
  locked: boolean;
  transform: ZimmerTransform;
  appearance: ZimmerAppearance;
  animation: SceneAnimation;
  content?: string;
  mediaUrl?: string;
  parentId?: string | null;
  dataSourceId?: string | null;
};

export type ZimmerBackground = {
  type: "color" | "gradient" | "image" | "gif" | "video";
  color: string;
  gradient?: string;
  mediaUrl?: string | null;
};

export type ZimmerStudySetDisplay = {
  mode: "tray" | "canvas" | "both" | "hidden";
  trayIcon: string;
  trayLabel: string;
  trayObjectId?: string | null;
};

export type ZimmerVisibility = "private" | "public";

// Editable room fields sent to the backend.
export type ZimmerWriteRequest = {
  schemaVersion: 1;
  expectedRevision: number | null;
  name: string;
  visibility: ZimmerVisibility;
  published: boolean;
  background: ZimmerBackground;
  objects: ZimmerObject[];
  studySets: ZimmerStudySetDisplay;
};

// Complete room returned by the backend.
export type ZimmerDocument = Omit<
  ZimmerWriteRequest,
  "expectedRevision"
> & {
  id: string;
  ownerId: number;
  revision: number;
  updatedAt: string;
};

// Local draft before a room has been saved.
export type ZimmerDraft = Omit<
  ZimmerWriteRequest,
  "expectedRevision"
>;

export const defaultZimmerAppearance: ZimmerAppearance = {
  opacity: 1,
  backgroundColor: "transparent",
  borderColor: "#ffffff",
  borderWidth: 0,
  borderRadius: 0,
  borderStyle: "none",
  boxShadow: "none",
  blur: 0,
  color: "#ffffff",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: 24,
  fontWeight: 400,
};

export function createZimmerObject(
  id: string,
  type: ZimmerObjectType,
  name: string
): ZimmerObject {
  return {
    id,
    type,
    name,
    visible: true,
    locked: false,
    animation: { ...defaultSceneAnimation },
    transform: {
      x: 100,
      y: 100,
      width: 300,
      height: 150,
      rotation: 0,
      zIndex: 1,
    },
    appearance: { ...defaultZimmerAppearance },
    content: "",
    parentId: null,
    dataSourceId: null,
  };
}

export function createDefaultZimmer(): ZimmerDraft {
  return {
    schemaVersion: 1,
    name: "My Zimmer",
    visibility: "private",
    published: false,
    background: {
      type: "gradient",
      color: "#080817",
      gradient:
        "radial-gradient(circle at 50% 35%, #34245d, #080817)",
      mediaUrl: null,
    },
    objects: [],
    studySets: {
      mode: "tray",
      trayIcon: "✧",
      trayLabel: "My Study Sets",
      trayObjectId: null,
    },
  };
}

// Prepare a draft for the backend.
// Pass null only when creating a new room.
export function createZimmerWriteRequest(
  draft: ZimmerDraft,
  expectedRevision: number | null
): ZimmerWriteRequest {
  return {
    ...draft,
    expectedRevision,
  };
}

