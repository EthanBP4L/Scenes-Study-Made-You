
export type SceneAnimationType =
  | "none"
  | "float"
  | "sway"
  | "spin"
  | "pulse"
  | "bounce";

export type SceneAnimation = {
  type: SceneAnimationType;
  duration: number;
  delay: number;
  intensity: number;
  infinite: boolean;
};

export const defaultSceneAnimation: SceneAnimation = {
  type: "none",
  duration: 6,
  delay: 0,
  intensity: 1,
  infinite: true,
};

export type SceneStyleOverrides = {
  animation?: Partial<SceneAnimation>;
  opacity?: number;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  borderColor?: string;
  borderRadius?: number;
};

export function mergeSceneStyles(
  ...layers: SceneStyleOverrides[]
): SceneStyleOverrides {
  const result: SceneStyleOverrides = {};

  for (const layer of layers) {
    Object.assign(result, layer);

    if (layer.animation) {
      result.animation = {
        ...result.animation,
        ...layer.animation,
      };
    }
  }

  return result;
}
