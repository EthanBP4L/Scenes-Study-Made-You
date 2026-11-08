
export type GraphicsCategory =
  | "stickers"
  | "textures"
  | "backgrounds"
  | "gifs";

export type GraphicsAsset = {
  id: string;
  name: string;
  category: GraphicsCategory;
  src: string;
  tags: string[];
  animated: boolean;
  source: "scenes" | "external" | "upload";
  attribution?: string;
};


export const graphicsLibrary: GraphicsAsset[] = [
  {
    id: "chrome-heart",
    name: "Chrome Heart",
    category: "stickers",
    src: "/graphics/stickers/chrome-heart.png",
    tags: ["chrome", "heart", "silver", "y2k", "romantic"],
    animated: false,
    source: "scenes",
  },
  {
    id: "pink-bow",
    name: "Pink Bow",
    category: "stickers",
    src: "/graphics/stickers/pink-bow.png",
    tags: ["pink", "bow", "ribbon", "cute", "coquette"],
    animated: false,
    source: "scenes",
  },
  {
    id: "pink-rose",
    name: "Pink Rose",
    category: "stickers",
    src: "/graphics/stickers/pink-rose.png",
    tags: ["pink", "rose", "flower", "garden", "romantic"],
    animated: false,
    source: "scenes",
  },
  {
    id: "purple-butterfly",
    name: "Purple Butterfly",
    category: "stickers",
    src: "/graphics/stickers/purple-butterfly.png",
    tags: ["purple", "butterfly", "holographic", "dreamy"],
    animated: false,
    source: "scenes",
  },
  {
    id: "silver-sparkle",
    name: "Silver Sparkle",
    category: "stickers",
    src: "/graphics/stickers/silver-sparkle.png",
    tags: ["silver", "sparkle", "star", "glitter", "shine"],
    animated: false,
    source: "scenes",
  },
  {
    id: "silver-chain",
    name: "Silver Chain",
    category: "stickers",
    src: "/graphics/stickers/silver-chain.png",
    tags: ["silver", "chain", "metal", "grunge", "y2k"],
    animated: false,
    source: "scenes",
  },
];


export function searchGraphics(query: string): GraphicsAsset[] {
  const search = query.trim().toLowerCase();

  if (!search) {
    return graphicsLibrary;
  }

  return graphicsLibrary.filter((asset) => {
    const searchableText = [
      asset.name,
      asset.category,
      ...asset.tags,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search);
  });
}

export function getGraphicsByCategory(
  category: GraphicsCategory
): GraphicsAsset[] {
  return graphicsLibrary.filter(
    (asset) => asset.category === category
  );
}
