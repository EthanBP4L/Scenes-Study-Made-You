
export type SceneMaterial =
  | "solid"
  | "gradient"
  | "glass"
  | "glossy"
  | "marble";

export type SceneTextStyle = {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  color: string;
  material: SceneMaterial;
  gradientStart: string;
  gradientEnd: string;
  textShadow: string;
};

export type SceneBorderStyle = {
  width: number;
  style: "solid" | "dashed" | "dotted" | "none";
  color: string;
  radius: number;
};

export type SceneElementStyle = {
  opacity: number;
  backgroundColor: string;
  border: SceneBorderStyle;
  shadow: string;
  blur: number;
  rotation: number;
};

export type ScenePosition = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type SceneElement = {
  id: string;
  type: "text" | "image" | "gif" | "video" | "panel";
  position: ScenePosition;
  style: SceneElementStyle;
  text?: SceneTextStyle;
  mediaUrl?: string;
};

export type SceneTheme = {
  id: string;
  name: string;
  backgroundColor: string;
  fontFamily: string;
  elements: SceneElement[];
};
