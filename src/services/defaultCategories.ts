import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat_housing',
    name: 'Housing & Utilities',
    icon: 'Home',
    color: '#8b5cf6', // Purple
    budgetLimit: 25000,
    isDefault: true,
  },
  {
    id: 'cat_groceries',
    name: 'Groceries & Supplies',
    icon: 'ShoppingCart',
    color: '#10b981', // Emerald
    budgetLimit: 12000,
    isDefault: true,
  },
  {
    id: 'cat_food',
    name: 'Food & Dining',
    icon: 'Utensils',
    color: '#f97316', // Orange
    budgetLimit: 8000,
    isDefault: true,
  },
  {
    id: 'cat_transport',
    name: 'Transportation & Fuel',
    icon: 'Car',
    color: '#0ea5e9', // Sky blue
    budgetLimit: 5000,
    isDefault: true,
  },
  {
    id: 'cat_subscriptions',
    name: 'Bills & Subscriptions',
    icon: 'Receipt',
    color: '#06b6d4', // Cyan
    budgetLimit: 4000,
    isDefault: true,
  },
  {
    id: 'cat_shopping',
    name: 'Shopping & Retail',
    icon: 'ShoppingBag',
    color: '#ec4899', // Pink
    budgetLimit: 6000,
    isDefault: true,
  },
  {
    id: 'cat_entertainment',
    name: 'Entertainment & Leisure',
    icon: 'Film',
    color: '#eab308', // Amber
    budgetLimit: 3500,
    isDefault: true,
  },
  {
    id: 'cat_health',
    name: 'Health & Medical',
    icon: 'HeartPulse',
    color: '#ef4444', // Red
    budgetLimit: 4000,
    isDefault: true,
  },
  {
    id: 'cat_personal',
    name: 'Personal Care',
    icon: 'Sparkles',
    color: '#d946ef', // Fuchsia
    budgetLimit: 2500,
    isDefault: true,
  },
  {
    id: 'cat_other',
    name: 'Other & Miscellaneous',
    icon: 'Tag',
    color: '#64748b', // Slate
    budgetLimit: 3000,
    isDefault: true,
  },
];
