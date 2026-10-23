import {
  Dumbbell,
  Footprints,
  GraduationCap,
  Hammer,
  HandHeart,
  Landmark,
  Laptop,
  Leaf,
  type LucideIcon,
  MessagesSquare,
  Mic,
  Mountain,
  Music,
  PawPrint,
  Puzzle,
  Recycle,
  Sparkles,
  Ticket,
  UtensilsCrossed,
} from "lucide-react";

// Category.icon stores a lucide name; map it statically so only these icons get bundled.
const ICONS: Record<string, LucideIcon> = {
  Dumbbell,
  Music,
  Footprints,
  Ticket,
  Hammer,
  GraduationCap,
  Laptop,
  Mic,
  MessagesSquare,
  Landmark,
  HandHeart,
  Recycle,
  Mountain,
  Puzzle,
  UtensilsCrossed,
  PawPrint,
  Leaf,
  Sparkles,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
