

"use client";

import { useState } from "react";

export default function NavigationOrb() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      id="navigation-orb"
      className="absolute bottom-8 left-1/2 z-30 -translate-x-1/2"
    >
      <button
        type="button"
        aria-label={isExpanded ? "Close navigation" : "Explore SCENES"}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`scene-orb flex cursor-pointer items-center justify-center rounded-full border border-white/30 bg-white/10 text-white shadow-xl backdrop-blur-xl ${
          isExpanded ? "scene-orb-expanded" : "scene-orb-collapsed"
        }`}
      >
        <span className="text-[10px] tracking-widest">
          {isExpanded ? "CLOSE" : "EXPLORE"}
        </span>
      </button>
    </div>
  );
}
