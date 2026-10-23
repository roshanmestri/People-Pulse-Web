// Photos for categories that have one (public/images). Others fall back to an icon tile.
const CATEGORY_PHOTOS: Record<string, string> = {
  "sports-fitness": "/images/football.jpg",
  music: "/images/jam.jpg",
  "outdoors-travel": "/images/trek.jpg",
  "food-social": "/images/food.jpg",
  "cleanliness-drives": "/images/cleanup.jpg",
  wellness: "/images/yoga.jpg",
  "helping-hands": "/images/cleanup.jpg",
};

export function categoryPhoto(slug: string): string | null {
  return CATEGORY_PHOTOS[slug] ?? null;
}
