
"use client";

import { useEffect, useState } from "react";

import SceneBackground from "../components/SceneBackground";
import NavigationOrb from "../components/NavigationOrb";
import EditableSceneTitle from "../components/EditableSceneTitle";
import SceneEditor from "../components/SceneEditor";

import type { SceneTextStyle } from "../lib/sceneStyles";
import {
  defaultSceneAnimation,
  type SceneAnimation,
} from "../lib/sceneAnimations";

const STORAGE_KEY = "scenes-home-customization-v1";

const defaultTitle: SceneTextStyle = {
  content: "SCENES",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: 150,
  fontWeight: 900,
  letterSpacing: -10,
  color: "#ffffff",
  material: "glossy",
  gradientStart: "#d9f3ff",
  gradientEnd: "#7aa6ce",
  textShadow: "0 8px 25px rgba(0,0,0,0.25)",
};

const initialAnimation: SceneAnimation = {
  ...defaultSceneAnimation,
  type: "float",
};

type SavedCustomization = {
  title: SceneTextStyle;
  animation: SceneAnimation;
};

export default function Home() {
  const [title, setTitle] =
    useState<SceneTextStyle>(defaultTitle);

  const [titleAnimation, setTitleAnimation] =
    useState<SceneAnimation>(initialAnimation);

  const [editorOpen, setEditorOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load previously saved customization
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as Partial<SavedCustomization>;

        if (parsed.title && typeof parsed.title === "object") {
          setTitle({
            ...defaultTitle,
            ...parsed.title,
          });
        }

        if (parsed.animation && typeof parsed.animation === "object") {
          setTitleAnimation({
            ...initialAnimation,
            ...parsed.animation,
          });
        }
      }
    } catch (error) {
      console.warn("Could not load SCENES customization:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Automatically save customization after initial load
  useEffect(() => {
    if (!loaded) return;

    try {
      const customization: SavedCustomization = {
        title,
        animation: titleAnimation,
      };

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(customization)
      );
    } catch (error) {
      console.warn("Could not save SCENES customization:", error);
    }
  }, [title, titleAnimation, loaded]);

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#101018] text-white">
      <SceneBackground />

      <div
        id="scene-effects"
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      >
        <div className="scene-light scene-light-one" />
        <div className="scene-light scene-light-two" />
      </div>

      <EditableSceneTitle
        title={title}
        animation={titleAnimation}
      />

      <NavigationOrb />

      <button
        id="edit-raindrop"
        type="button"
        aria-label={
          editorOpen
            ? "Close customization editor"
            : "Open customization editor"
        }
        aria-expanded={editorOpen}
        onClick={() => setEditorOpen((open) => !open)}
        className="absolute right-6 top-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-xl transition hover:bg-white/20"
      >
        <span className="text-xl">💧</span>
      </button>

      {editorOpen && (
        <SceneEditor
          title={title}
          onChange={setTitle}
          animation={titleAnimation}
          onAnimationChange={setTitleAnimation}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </main>
  );
}
