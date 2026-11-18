export interface SalonIconItem {
  id: string;
  name: string;
  category: "hair" | "beard" | "spa" | "skin" | "color" | "care";
  type: "emoji" | "lucide" | "svgrepo" | "custom";
  value: string; // The emoji char, lucide icon name (e.g. "scissors"), or SVGRepo URL
  keywords: string[];
}

export interface SalonIconCategory {
  id: string;
  label: string;
  emoji: string;
}

export const SALON_ICON_CATEGORIES: SalonIconCategory[] = [
  { id: "ALL", label: "All Icons", emoji: "💈" },
  { id: "hair", label: "Haircuts & Styling", emoji: "✂️" },
  { id: "beard", label: "Beard & Shave", emoji: "🧔" },
  { id: "spa", label: "Massage & Spa", emoji: "💆" },
  { id: "skin", label: "Facials & Skin", emoji: "🧖" },
  { id: "color", label: "Color & Treatment", emoji: "🎨" },
  { id: "care", label: "Care & Combos", emoji: "✨" },
];

export const CURATED_SALON_ICONS: SalonIconItem[] = [
  // 1. HAIRCUTS & STYLING
  {
    id: "hair-scissors-emoji",
    name: "Classic Scissors",
    category: "hair",
    type: "emoji",
    value: "✂️",
    keywords: ["haircut", "cut", "trim", "scissor", "fade", "crop"],
  },
  {
    id: "hair-barber-pole-emoji",
    name: "Barbershop Pole",
    category: "hair",
    type: "emoji",
    value: "💈",
    keywords: ["barber", "salon", "classic", "shop", "haircut"],
  },
  {
    id: "hair-styling-emoji",
    name: "Styling & Blowout",
    category: "hair",
    type: "emoji",
    value: "💇",
    keywords: ["style", "blowout", "haircut", "dry", "women", "men"],
  },
  {
    id: "hair-blowdry-emoji",
    name: "Hair Dryer & Set",
    category: "hair",
    type: "emoji",
    value: "💨",
    keywords: ["blowdry", "dryer", "heat", "styling", "volume"],
  },
  {
    id: "hair-comb-emoji",
    name: "Precision Comb",
    category: "hair",
    type: "emoji",
    value: "🪮",
    keywords: ["comb", "parting", "sectioning", "tangle", "hair"],
  },
  {
    id: "hair-lucide-scissors",
    name: "Precision Shears (Vector)",
    category: "hair",
    type: "lucide",
    value: "scissors",
    keywords: ["shears", "scissors", "haircut", "fade", "precision"],
  },
  {
    id: "hair-lucide-zap",
    name: "Express Buzz Cut",
    category: "hair",
    type: "lucide",
    value: "zap",
    keywords: ["clipper", "buzz", "quick", "express", "fast"],
  },
  {
    id: "hair-svgrepo-clipper",
    name: "Hair Clipper (SVGRepo)",
    category: "hair",
    type: "svgrepo",
    value: "https://www.svgrepo.com/show/475142/hair-clipper.svg",
    keywords: ["clipper", "trimmer", "fade", "buzz", "machine"],
  },
  {
    id: "hair-svgrepo-scissors",
    name: "Barber Shears (SVGRepo)",
    category: "hair",
    type: "svgrepo",
    value: "https://www.svgrepo.com/show/491444/scissors.svg",
    keywords: ["scissors", "shears", "haircut", "barber"],
  },
  {
    id: "hair-svgrepo-dryer",
    name: "Salon Dryer (SVGRepo)",
    category: "hair",
    type: "svgrepo",
    value: "https://www.svgrepo.com/show/475141/hair-dryer.svg",
    keywords: ["dryer", "blowout", "heat", "styling"],
  },

  // 2. BEARD & SHAVE
  {
    id: "beard-man-emoji",
    name: "Full Beard Trim",
    category: "beard",
    type: "emoji",
    value: "🧔",
    keywords: ["beard", "trim", "shaping", "goatee", "grooming"],
  },
  {
    id: "beard-razor-emoji",
    name: "Straight Razor Shave",
    category: "beard",
    type: "emoji",
    value: "🪒",
    keywords: ["razor", "shave", "clean", "blade", "lineup", "hot towel"],
  },
  {
    id: "beard-mustache-emoji",
    name: "Mustache Grooming",
    category: "beard",
    type: "emoji",
    value: "🧔‍♂️",
    keywords: ["mustache", "beard", "stache", "lineup", "styling"],
  },
  {
    id: "beard-lotion-emoji",
    name: "Aftershave Balm",
    category: "beard",
    type: "emoji",
    value: "🧴",
    keywords: ["aftershave", "balm", "oil", "beard oil", "care"],
  },
  {
    id: "beard-lucide-brush",
    name: "Beard Brush & Shave",
    category: "beard",
    type: "lucide",
    value: "brush",
    keywords: ["brush", "shave", "foam", "lather", "clean"],
  },
  {
    id: "beard-svgrepo-razor",
    name: "Classic Razor (SVGRepo)",
    category: "beard",
    type: "svgrepo",
    value: "https://www.svgrepo.com/show/475143/razor.svg",
    keywords: ["razor", "blade", "shave", "clean shave", "hot towel"],
  },
  {
    id: "beard-svgrepo-shaving-brush",
    name: "Shaving Foam Brush (SVGRepo)",
    category: "beard",
    type: "svgrepo",
    value: "https://www.svgrepo.com/show/475144/shaving-brush.svg",
    keywords: ["shaving brush", "foam", "lather", "soap", "barber"],
  },

  // 3. MASSAGE & SPA
  {
    id: "spa-head-massage-emoji",
    name: "Head Massage (Champy)",
    category: "spa",
    type: "emoji",
    value: "💆",
    keywords: ["massage", "head", "champy", "oil", "relax", "stress"],
  },
  {
    id: "spa-steam-emoji",
    name: "Steam & Hot Towel",
    category: "spa",
    type: "emoji",
    value: "🧖",
    keywords: ["steam", "hot towel", "refresh", "relax", "sauna"],
  },
  {
    id: "spa-droplet-emoji",
    name: "Essential Oil Therapy",
    category: "spa",
    type: "emoji",
    value: "💧",
    keywords: ["oil", "ayurvedic", "essential", "champy", "therapy"],
  },
  {
    id: "spa-lucide-droplets",
    name: "Herbal Oil Spa (Vector)",
    category: "spa",
    type: "lucide",
    value: "droplets",
    keywords: ["droplets", "oil", "massage", "spa", "herbal"],
  },
  {
    id: "spa-lucide-flame",
    name: "Hot Oil Champy (Vector)",
    category: "spa",
    type: "lucide",
    value: "flame",
    keywords: ["hot oil", "warm", "champy", "massage", "relax"],
  },
  {
    id: "spa-svgrepo-massage",
    name: "Relaxation Spa (SVGRepo)",
    category: "spa",
    type: "svgrepo",
    value: "https://www.svgrepo.com/show/475138/spa.svg",
    keywords: ["spa", "massage", "relax", "wellness", "head massage"],
  },
  {
    id: "spa-svgrepo-towel",
    name: "Hot Towel Wrap (SVGRepo)",
    category: "spa",
    type: "svgrepo",
    value: "https://www.svgrepo.com/show/475140/towel.svg",
    keywords: ["towel", "hot towel", "steam", "clean", "refresh"],
  },

  // 4. FACIALS & SKINCARE
  {
    id: "skin-face-mask-emoji",
    name: "De-Tan & Face Pack",
    category: "skin",
    type: "emoji",
    value: "🎭",
    keywords: ["mask", "detan", "face pack", "d-tan", "charcoal", "peel"],
  },
  {
    id: "skin-cleanse-emoji",
    name: "Face Wash & Scrub",
    category: "skin",
    type: "emoji",
    value: "🧼",
    keywords: ["scrub", "cleanse", "wash", "soap", "blackhead", "facial"],
  },
  {
    id: "skin-glow-emoji",
    name: "Gold & Diamond Glow",
    category: "skin",
    type: "emoji",
    value: "✨",
    keywords: ["glow", "gold", "diamond", "brightening", "bleach", "facial"],
  },
  {
    id: "skin-lucide-sparkles",
    name: "Deep Cleansing Facial (Vector)",
    category: "skin",
    type: "lucide",
    value: "sparkles",
    keywords: ["facial", "glow", "clean-up", "brightening", "sparkles"],
  },
  {
    id: "skin-svgrepo-mask",
    name: "Facial Sheet Mask (SVGRepo)",
    category: "skin",
    type: "svgrepo",
    value: "https://www.svgrepo.com/show/475139/facial-mask.svg",
    keywords: ["mask", "facial", "skincare", "skin", "detan"],
  },

  // 5. COLOR & CHEMICAL TREATMENTS
  {
    id: "color-palette-emoji",
    name: "Hair Color & Dye",
    category: "color",
    type: "emoji",
    value: "🎨",
    keywords: ["color", "dye", "highlights", "tint", "beard color", "black"],
  },
  {
    id: "color-flask-emoji",
    name: "Keratin & Smoothening",
    category: "color",
    type: "emoji",
    value: "🧪",
    keywords: ["keratin", "smoothening", "rebonding", "botox", "chemical"],
  },
  {
    id: "color-leaf-emoji",
    name: "Organic Mehndi / Henna",
    category: "color",
    type: "emoji",
    value: "🌿",
    keywords: ["henna", "mehndi", "organic", "herbal", "natural", "hair"],
  },
  {
    id: "color-lucide-palette",
    name: "Color Highlights (Vector)",
    category: "color",
    type: "lucide",
    value: "palette",
    keywords: ["color", "highlights", "balayage", "streaks"],
  },

  // 6. CARE, WASH & COMBOS
  {
    id: "care-shower-emoji",
    name: "Hair Wash & Conditioning",
    category: "care",
    type: "emoji",
    value: "🚿",
    keywords: ["wash", "shampoo", "conditioner", "rinse", "shower"],
  },
  {
    id: "care-nails-emoji",
    name: "Nail Care & Mani-Pedi",
    category: "care",
    type: "emoji",
    value: "💅",
    keywords: ["manicure", "pedicure", "nail", "cuticle", "grooming"],
  },
  {
    id: "care-crown-emoji",
    name: "Royal Grooming Combo",
    category: "care",
    type: "emoji",
    value: "👑",
    keywords: ["combo", "royal", "vip", "wedding", "groom", "package"],
  },
  {
    id: "care-star-emoji",
    name: "Signature Service",
    category: "care",
    type: "emoji",
    value: "⭐",
    keywords: ["signature", "popular", "best", "special", "combo"],
  },
  {
    id: "care-lucide-crown",
    name: "Royal Package (Vector)",
    category: "care",
    type: "lucide",
    value: "crown",
    keywords: ["royal", "combo", "vip", "groom", "premium"],
  },
  {
    id: "care-lucide-shower",
    name: "Shampoo & Rinse (Vector)",
    category: "care",
    type: "lucide",
    value: "shower-head",
    keywords: ["wash", "shower", "shampoo", "rinse"],
  },
];

/**
 * Sub-millisecond client-side semantic icon search
 */
export function searchSalonIcons(query: string, category: string = "ALL"): SalonIconItem[] {
  const cleanQ = (query || "").trim().toLowerCase();
  
  return CURATED_SALON_ICONS.filter((item) => {
    // 1. Category Filter
    if (category !== "ALL" && item.category !== category) {
      return false;
    }

    // 2. Query Filter (Matches Name or any Keyword)
    if (!cleanQ) return true;

    if (item.name.toLowerCase().includes(cleanQ)) return true;
    if (item.value.toLowerCase().includes(cleanQ)) return true;
    return item.keywords.some((kw) => kw.toLowerCase().includes(cleanQ));
  });
}

/**
 * Look up a curated icon by exact value or ID
 */
export function findSalonIcon(valOrId: string | null | undefined): SalonIconItem | null {
  if (!valOrId) return null;
  const match = CURATED_SALON_ICONS.find(
    (i) => i.id === valOrId || i.value === valOrId
  );
  return match || null;
}

/**
 * Smart bidirectional algorithm: matches a service name against curated salon icons
 * and returns the best matching icon.
 */
export function suggestIconForServiceName(serviceName: string): SalonIconItem | null {
  const matches = suggestMultipleIconsForServiceName(serviceName, 1);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Returns top-N matching icons for a typed service name, ordered by relevance score.
 */
export function suggestMultipleIconsForServiceName(serviceName: string, limit = 4): SalonIconItem[] {
  if (!serviceName) return [];
  const text = serviceName.trim().toLowerCase();
  if (text.length < 2) return [];

  // Extract individual words/tokens (e.g. "Royal Beard Shaping" -> ["royal", "beard", "shaping"])
  const tokens = text
    .split(/[\s\-_\/,&+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  if (tokens.length === 0) return [];

  const scored = CURATED_SALON_ICONS.map((item) => {
    let score = 0;
    const itemName = item.name.toLowerCase();
    const itemValue = item.value.toLowerCase();
    const kws = item.keywords.map((k) => k.toLowerCase());

    // 1. Exact or substring phrase match
    if (itemName === text) {
      score += 100;
    } else if (itemName.includes(text)) {
      score += 60;
    } else if (text.includes(itemName)) {
      score += 50;
    }

    // 2. Token-level matches
    for (const token of tokens) {
      if (itemName.includes(token)) score += 30;

      // Exact keyword match
      if (kws.includes(token)) {
        score += 40;
      } else {
        // Partial keyword match
        for (const kw of kws) {
          if (kw.includes(token) || token.includes(kw)) {
            if (token.length >= 3) score += 20;
          }
        }
      }

      // 3. Domain-specific semantic intent weights
      if (["hair", "cut", "haircut", "fade", "crop", "trim", "scissor", "cutting"].includes(token) && item.category === "hair") {
        score += 30;
      }
      if (["beard", "shave", "stache", "mustache", "dadhi", "khat", "razor"].includes(token) && item.category === "beard") {
        score += 35;
      }
      if (["massage", "head", "champy", "champi", "spa", "relax", "oil"].includes(token) && item.category === "spa") {
        score += 35;
      }
      if (["facial", "skin", "detan", "d-tan", "glow", "bleach", "scrub", "cleanup", "clean-up"].includes(token) && item.category === "skin") {
        score += 35;
      }
      if (["color", "colour", "dye", "highlights", "mehndi", "henna", "keratin"].includes(token) && item.category === "color") {
        score += 35;
      }
      if (["wash", "shampoo", "rinse", "conditioner"].includes(token) && (item.category === "care" || item.keywords.includes("wash"))) {
        score += 35;
      }
      if (["combo", "package", "royal", "vip", "groom"].includes(token) && item.category === "care") {
        score += 25;
      }
    }

    return { item, score };
  });

  return scored
    .filter((entry) => entry.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
