
"use client";

import type { SceneTextStyle } from "../lib/sceneStyles";
import type { SceneAnimation } from "../lib/sceneAnimations";

import { renderTextStyle } from "../lib/sceneRenderer";
import { renderSceneAnimation } from "../lib/sceneAnimationRenderer";

type Props = {
  title: SceneTextStyle;
  animation: SceneAnimation;
};

export default function EditableSceneTitle({
  title,
  animation,
}: Props) {
  return (
    <div
      id="scene-title"
      className="scene-animated relative z-20 max-w-full px-6 text-center"
      style={renderSceneAnimation(animation)}
    >
      <h1
        className="font-black leading-none"
        style={{
          ...renderTextStyle(title),
          fontSize: `clamp(20px, ${title.fontSize / 10}vw, ${title.fontSize}px)`,
          maxWidth: "100%",
        }}
      >
        {title.content}
      </h1>
    </div>
  );
}
