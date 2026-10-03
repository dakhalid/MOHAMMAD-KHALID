import React from 'react';
import {
  Utensils,
  ShoppingCart,
  Car,
  Home,
  ShoppingBag,
  Film,
  HeartPulse,
  Receipt,
  Sparkles,
  Tag,
  Coffee,
  Plane,
  Book,
  Briefcase,
  Gift,
  DollarSign,
  Smartphone,
  Zap,
  Wrench,
  Fuel,
  Smile,
  LucideProps,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  Utensils,
  ShoppingCart,
  Car,
  Home,
  ShoppingBag,
  Film,
  HeartPulse,
  Receipt,
  Sparkles,
  Tag,
  Coffee,
  Plane,
  Book,
  Briefcase,
  Gift,
  DollarSign,
  Smartphone,
  Zap,
  Wrench,
  Fuel,
  Smile,
};

export const AVAILABLE_CATEGORY_ICONS = Object.keys(ICON_MAP);

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-5 h-5', size = 20 }) => {
  const IconComponent = ICON_MAP[name] || Tag;
  return <IconComponent className={className} size={size} />;
};
