
import type { CSSProperties } from "react";

import type {
  SceneElementStyle,
  SceneTextStyle,
} from "./sceneStyles";

// Convert shared element properties into real CSS.
export function renderElementStyle(
  style: SceneElementStyle
): CSSProperties {
  return {
    opacity: style.opacity,
    backgroundColor: style.backgroundColor,
    borderWidth: style.border.width,
    borderStyle: style.border.style,
    borderColor: style.border.color,
    borderRadius: style.border.radius,
    boxShadow: style.shadow,
    filter: `blur(${style.blur}px)`,
    transform: `rotate(${style.rotation}deg)`,
  };
}

// Convert customizable text properties into real CSS.
export function renderTextStyle(
  text: SceneTextStyle
): CSSProperties {
  const result: CSSProperties = {
    fontFamily: text.fontFamily,
    fontSize: `${text.fontSize}px`,
    fontWeight: text.fontWeight,
    letterSpacing: `${text.letterSpacing}px`,
    textShadow: text.textShadow,
  };

  switch (text.material) {
    case "gradient":
      return {
        ...result,
        backgroundImage: `linear-gradient(120deg, ${text.gradientStart}, ${text.gradientEnd})`,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
      };

    case "glass":
      return {
        ...result,
        color: text.color,
        WebkitTextStroke: "1px rgba(255,255,255,0.45)",
        textShadow:
          "0 2px 8px rgba(255,255,255,0.5), 0 8px 24px rgba(0,0,0,0.3)",
      };

    
case "glossy":
  return {
    ...result,
    backgroundImage: `linear-gradient(
      180deg,
      #ffffff 0%,
      ${text.color} 20%,
      ${text.gradientStart} 42%,
      ${text.gradientEnd} 70%,
      ${text.color} 100%
    )`,
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    filter: "drop-shadow(0 4px 12px rgba(255,255,255,0.2))",
  };

    case "marble":
      return {
        ...result,
        backgroundImage: `repeating-linear-gradient(135deg, ${text.gradientStart} 0px, #ffffff 18px, ${text.gradientEnd} 36px, ${text.gradientStart} 58px)`,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
      };

    default:
      return {
        ...result,
        color: text.color,
      };
  }
}
