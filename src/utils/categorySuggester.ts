import { Category } from '../types';

/**
 * Keyword database mapping common user notes, expenses, and items to standard category IDs.
 * Specifically tuned to be student-friendly (Class 6 & general everyday items) and Indian daily context.
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Food & Dining / Snacks / Canteen
  cat_food: [
    'food',
    'snack',
    'snacks',
    'lunch',
    'dinner',
    'breakfast',
    'canteen',
    'tiffin',
    'samosa',
    'burger',
    'pizza',
    'sandwich',
    'ice cream',
    'icecream',
    'chocolate',
    'chocolates',
    'candy',
    'candies',
    'chips',
    'juice',
    'cold drink',
    'soda',
    'maggi',
    'noodles',
    'pasta',
    'restaurant',
    'cafe',
    'coffee',
    'chai',
    'tea',
    'biscuit',
    'biscuits',
    'cookies',
    'pastry',
    'cake',
    'pastries',
    'momo',
    'momos',
    'roll',
    'shawarma',
    'biryani',
    'roti',
    'paratha',
    'dosa',
    'idli',
    'vada',
    'pani puri',
    'chaat',
    'kachori',
    'sweets',
    'mithai',
    'kulfi',
    'shake',
    'milkshake',
    'lassi',
    'swiggy',
    'zomato',
    'treat',
    'party',
  ],

  // Groceries & Daily Kitchen Supplies
  cat_groceries: [
    'grocery',
    'groceries',
    'milk',
    'bread',
    'butter',
    'egg',
    'eggs',
    'vegetable',
    'vegetables',
    'veggie',
    'veggies',
    'sabzi',
    'fruit',
    'fruits',
    'apple',
    'apples',
    'banana',
    'bananas',
    'mango',
    'mangoes',
    'potato',
    'potatoes',
    'tomato',
    'tomatoes',
    'onion',
    'onions',
    'dal',
    'pulses',
    'rice',
    'chawal',
    'atta',
    'flour',
    'wheat',
    'sugar',
    'salt',
    'oil',
    'ghee',
    'paneer',
    'cheese',
    'curd',
    'dahi',
    'yogurt',
    'supermarket',
    'mart',
    'kirana',
    'store',
    'zepto',
    'blinkit',
    'instamart',
    'bigbasket',
    'spices',
    'masala',
    'tea leaves',
  ],

  // Travel, School Bus & Transport
  cat_transport: [
    'bus',
    'school bus',
    'auto',
    'rickshaw',
    'autorickshaw',
    'metro',
    'train',
    'ticket',
    'tickets',
    'pass',
    'bus pass',
    'fare',
    'cab',
    'taxi',
    'uber',
    'ola',
    'rapido',
    'petrol',
    'diesel',
    'fuel',
    'cng',
    'scooter',
    'bike',
    'cycle',
    'bicycle',
    'cycle repair',
    'puncture',
    'air',
    'tyre',
    'parking',
    'flight',
    'toll',
    'travel',
    'commute',
  ],

  // Books, Stationery & Shopping (Class 6 Essentials)
  cat_shopping: [
    'book',
    'books',
    'textbook',
    'textbooks',
    'notebook',
    'notebooks',
    'copy',
    'copies',
    'register',
    'pen',
    'pens',
    'pencil',
    'pencils',
    'eraser',
    'rubber',
    'sharpener',
    'ruler',
    'scale',
    'geometry box',
    'compass',
    'protractor',
    'crayons',
    'color pencils',
    'colors',
    'colours',
    'paint',
    'water color',
    'sketch pen',
    'sketch pens',
    'marker',
    'stationery',
    'school bag',
    'bag',
    'backpack',
    'pencil box',
    'pouch',
    'bottle',
    'water bottle',
    'tiffin box',
    'lunch box',
    'uniform',
    'school uniform',
    'tie',
    'belt',
    'shoes',
    'socks',
    'clothes',
    'dress',
    'shirt',
    't-shirt',
    'pants',
    'trousers',
    'jeans',
    'jacket',
    'sweater',
    'raincoat',
    'umbrella',
    'toy',
    'toys',
    'sticker',
    'stickers',
    'craft',
    'glue',
    'fevicol',
    'scissors',
    'tape',
    'chart paper',
    'project',
    'amazon',
    'flipkart',
    'gift',
    'watch',
  ],

  // Games, Movies & Fun
  cat_entertainment: [
    'movie',
    'movies',
    'cinema',
    'theatre',
    'popcorn',
    'game',
    'games',
    'gaming',
    'video game',
    'playstation',
    'xbox',
    'arcade',
    'amusement park',
    'water park',
    'park',
    'fair',
    'mela',
    'outing',
    'picnic',
    'cricket',
    'football',
    'badminton',
    'shuttle',
    'bat',
    'ball',
    'tennis',
    'match',
    'stadium',
    'comic',
    'comics',
    'manga',
    'board game',
    'chess',
    'ludo',
    'carrom',
    'fun',
  ],

  // Health, Medicine & Doctor
  cat_health: [
    'medicine',
    'medicines',
    'tablets',
    'pills',
    'syrup',
    'doctor',
    'clinic',
    'hospital',
    'checkup',
    'dentist',
    'teeth',
    'eye',
    'spectacles',
    'chashma',
    'glasses',
    'bandage',
    'bandaid',
    'first aid',
    'antiseptic',
    'dettol',
    'thermometer',
    'medical',
    'pharmacy',
    'chemist',
    'injection',
    'vaccine',
    'fever',
    'cold',
    'cough',
    'headache',
    'ointment',
  ],

  // Mobile Recharge, WiFi & Subscriptions
  cat_subscriptions: [
    'recharge',
    'mobile recharge',
    'phone recharge',
    'wifi',
    'wi-fi',
    'internet',
    'broadband',
    'fiber',
    'netflix',
    'prime',
    'hotstar',
    'disney',
    'spotify',
    'youtube',
    'subscription',
    'sim',
    'jio',
    'airtel',
    'vi',
    'cable',
    'dth',
    'tata sky',
  ],

  // House, Rent & Utilities
  cat_housing: [
    'rent',
    'house rent',
    'room rent',
    'flat',
    'electricity',
    'electric bill',
    'power bill',
    'current bill',
    'water bill',
    'maintenance',
    'repair',
    'plumber',
    'electrician',
    'cleaning',
    'maid',
    'cook',
    'cylinder',
    'gas',
  ],

  // Personal Care & Hygiene
  cat_personal: [
    'haircut',
    'salon',
    'barber',
    'soap',
    'shampoo',
    'conditioner',
    'toothpaste',
    'toothbrush',
    'brush',
    'comb',
    'hair oil',
    'cream',
    'lotion',
    'face wash',
    'powder',
    'talc',
    'deodorant',
    'perfume',
    'sanitizer',
  ],
};

export interface CategorySuggestionResult {
  category: Category;
  matchedKeyword: string;
}

/**
 * Suggests the most suitable category based on keywords found in the user's note.
 * Returns null if no relevant keyword matches.
 */
export function suggestCategoryFromNote(
  note: string,
  categories: Category[]
): CategorySuggestionResult | null {
  if (!note || !note.trim()) {
    return null;
  }

  // Normalize note: lowercase, remove special characters except spaces
  const cleanNote = note.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const words = cleanNote.split(/\s+/).filter(Boolean);

  if (words.length === 0) return null;

  let bestMatch: { categoryId: string; keyword: string; priority: number } | null = null;

  // Search through all category keyword sets
  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase();

      // Check multi-word keyword match in the full text
      if (lowerKw.includes(' ')) {
        if (cleanNote.includes(lowerKw)) {
          const priority = lowerKw.length * 2; // multi-word matches get higher weight
          if (!bestMatch || priority > bestMatch.priority) {
            bestMatch = { categoryId: catId, keyword: kw, priority };
          }
        }
      } else {
        // Check single word exact match in token list
        if (words.includes(lowerKw)) {
          const priority = lowerKw.length;
          if (!bestMatch || priority > bestMatch.priority) {
            bestMatch = { categoryId: catId, keyword: kw, priority };
          }
        }
      }
    }
  }

  if (!bestMatch) {
    // Also check direct match with category names themselves
    for (const cat of categories) {
      const catLower = cat.name.toLowerCase();
      if (cleanNote.includes(catLower)) {
        return {
          category: cat,
          matchedKeyword: cat.name,
        };
      }
    }
    return null;
  }

  // Find corresponding category in user's category list
  const matchedCategory = categories.find((c) => c.id === bestMatch?.categoryId);

  if (!matchedCategory) {
    return null;
  }

  return {
    category: matchedCategory,
    matchedKeyword: bestMatch.keyword,
  };
}
