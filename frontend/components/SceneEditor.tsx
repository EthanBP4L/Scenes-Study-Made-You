
"use client";
import FloatingEditor from "./FloatingEditor";
import type {
  SceneTextStyle,
  SceneMaterial,
} from "../lib/sceneStyles";

import type {
  SceneAnimation,
  SceneAnimationType,
} from "../lib/sceneAnimations";

type Props = {
  title: SceneTextStyle;
  onChange: (title: SceneTextStyle) => void;
  animation: SceneAnimation;
  onAnimationChange: (animation: SceneAnimation) => void;
  onClose: () => void;
};

export default function SceneEditor({
  title,
  onChange,
  animation,
  onAnimationChange,
  onClose,
}: Props) {
  function updateText<K extends keyof SceneTextStyle>(
    key: K,
    value: SceneTextStyle[K]
  ) {
    onChange({ ...title, [key]: value });
  }

  function updateAnimation<K extends keyof SceneAnimation>(
    key: K,
    value: SceneAnimation[K]
  ) {
    onAnimationChange({ ...animation, [key]: value });
  }

  const fieldClass =
    "mt-1 w-full rounded-xl border border-white/20 bg-white/10 p-2";

  const selectClass =
    "mt-1 w-full rounded-xl border border-white/20 bg-[#26334c] p-2";

  
   
  return (
    <FloatingEditor
      launcherId="edit-raindrop"
      storageKey="scenes-home-editor-position-v1"
      ariaLabel="SCENES customization editor"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <div
          data-panel-drag-handle
          className="mb-3 flex cursor-grab touch-none items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 active:cursor-grabbing"
        >

   <h2 className="text-lg font-bold">
          Customize SCENES
        </h2>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close editor"
          className="rounded-full px-3 py-1 hover:bg-white/15"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="border-b border-white/20 pb-2 font-semibold">
          Typography
        </h3>

        <label className="block text-sm">
          Heading text
          <input
            value={title.content}
            maxLength={30}
            onChange={(e) =>
              updateText("content", e.target.value)
            }
            className={fieldClass}
          />
        </label>

        <label className="block text-sm">
          Font
          <select
            value={title.fontFamily}
            onChange={(e) =>
              updateText("fontFamily", e.target.value)
            }
            className={selectClass}
          >
            <option value="Arial, Helvetica, sans-serif">
              Arial
            </option>
            <option value="Georgia, serif">
              Georgia
            </option>
            <option value="'Times New Roman', serif">
              Times New Roman
            </option>
            <option value="'Courier New', monospace">
              Courier New
            </option>
            <option value="Impact, sans-serif">
              Impact
            </option>
          </select>
        </label>

        <label className="block text-sm">
          Material
          <select
            value={title.material}
            onChange={(e) =>
              updateText(
                "material",
                e.target.value as SceneMaterial
              )
            }
            className={selectClass}
          >
            <option value="solid">Solid</option>
            <option value="gradient">Gradient</option>
            <option value="glass">Glass</option>
            <option value="glossy">Glossy</option>
            <option value="marble">Marble</option>
          </select>
        </label>

        <label className="block text-sm">
          Font size: {title.fontSize}px
          <input
            type="range"
            min="40"
            max="220"
            value={title.fontSize}
            onChange={(e) =>
              updateText("fontSize", Number(e.target.value))
            }
            className="mt-2 w-full"
          />
        </label>

        <label className="block text-sm">
          Letter spacing: {title.letterSpacing}px
          <input
            type="range"
            min="-15"
            max="25"
            value={title.letterSpacing}
            onChange={(e) =>
              updateText(
                "letterSpacing",
                Number(e.target.value)
              )
            }
            className="mt-2 w-full"
          />
        </label>

        <label className="block text-sm">
          Text color
          <input
            type="color"
            value={title.color}
            onChange={(e) =>
              updateText("color", e.target.value)
            }
            className="mt-2 block h-10 w-full cursor-pointer"
          />
        </label>

        <label className="block text-sm">
          Gradient start
          <input
            type="color"
            value={title.gradientStart}
            onChange={(e) =>
              updateText("gradientStart", e.target.value)
            }
            className="mt-2 block h-10 w-full cursor-pointer"
          />
        </label>

        <label className="block text-sm">
          Gradient end
          <input
            type="color"
            value={title.gradientEnd}
            onChange={(e) =>
              updateText("gradientEnd", e.target.value)
            }
            className="mt-2 block h-10 w-full cursor-pointer"
          />
        </label>

        <h3 className="border-b border-white/20 pb-2 pt-4 font-semibold">
          Animation
        </h3>

        <label className="block text-sm">
          Movement type
          <select
            value={animation.type}
            onChange={(e) =>
              updateAnimation(
                "type",
                e.target.value as SceneAnimationType
              )
            }
            className={selectClass}
          >
            <option value="none">None</option>
            <option value="float">Float</option>
            <option value="sway">Sway</option>
            <option value="spin">Spin</option>
            <option value="pulse">Pulse</option>
            <option value="bounce">Bounce</option>
          </select>
        </label>

        <label className="block text-sm">
          Duration: {animation.duration.toFixed(1)} seconds
          <input
            type="range"
            min="0.5"
            max="20"
            step="0.5"
            value={animation.duration}
            onChange={(e) =>
              updateAnimation(
                "duration",
                Number(e.target.value)
              )
            }
            className="mt-2 w-full"
          />
        </label>

        <label className="block text-sm">
          Movement intensity: {animation.intensity.toFixed(1)}×
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={animation.intensity}
            onChange={(e) =>
              updateAnimation(
                "intensity",
                Number(e.target.value)
              )
            }
            className="mt-2 w-full"
          />
        </label>

        <label className="block text-sm">
          Start delay: {animation.delay.toFixed(1)} seconds
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={animation.delay}
            onChange={(e) =>
              updateAnimation(
                "delay",
                Number(e.target.value)
              )
            }
            className="mt-2 w-full"
          />
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={animation.infinite}
            onChange={(e) =>
              updateAnimation("infinite", e.target.checked)
            }
            className="h-4 w-4 accent-blue-400"
          />
          Loop animation forever
        </label>

        <button
          type="button"
          onClick={() =>
            onAnimationChange({
              type: "float",
              duration: 6,
              delay: 0,
              intensity: 1,
              infinite: true,
            })
          }
          className="w-full rounded-xl border border-white/20 bg-white/10 p-2 text-sm transition hover:bg-white/20"
        >
          Reset animation
        </button>
      </div>
    </div>
  </FloatingEditor>
  );
}