
import type { CSSProperties } from "react";
import type { SceneAnimation } from "./sceneAnimations";

export function renderSceneAnimation(
  animation: SceneAnimation
): CSSProperties {
  if (animation.type === "none") {
    return {
      animation: "none",
    };
  }

  const duration = Math.max(0.1, animation.duration);
  const delay = Math.max(0, animation.delay);
  const intensity = Math.max(0, animation.intensity);

  return {
    animationName: `scene-${animation.type}`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    animationTimingFunction: "ease-in-out",
    animationIterationCount: animation.infinite
      ? "infinite"
      : 1,
    animationFillMode: "both",

    // Each animation can use this variable
    // to control how dramatic its movement is.
    ["--scene-motion-intensity" as string]: intensity,
  } as CSSProperties;
}
