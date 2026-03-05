export const SAFE_TAGS = [
  "kids",
  "children",
  "family",
  "education",
  "classical",
  "folk",
  "lullabies"
] as const;

export type SafeTag = (typeof SAFE_TAGS)[number];

export const SAFE_TAG_ALIASES: Record<SafeTag, readonly string[]> = {
  kids: [
    "kid",
    "kids",
    "kid friendly",
    "kid-friendly",
    "kids music",
    "kids-music",
    "дети",
    "детский",
    "детская",
    "детское",
    "діти",
    "дитячий",
    "дитяча",
    "дитяче",
    "bola",
    "bolalar",
    "bolajon",
    "болалар",
    "болажон"
  ],
  children: [
    "child",
    "children",
    "childrens",
    "children's",
    "children music",
    "children's music",
    "childrens music",
    "для детей",
    "для дітей",
    "детям",
    "дитячі",
    "bolalar uchun",
    "болалар учун"
  ],
  family: ["family", "family friendly", "family-friendly", "семья", "семейный", "семейная", "сімя", "сімейний", "сімейна", "oila", "оила"],
  education: ["education", "educational", "образование", "обучение", "освіта", "навчання", "talim", "ta'lim", "ta’lim", "talimiy", "таълим"],
  classical: ["classical", "classical music", "классическая", "классика", "классик", "класична", "класика", "klassik", "klassika"],
  folk: ["folk", "folk music", "народная", "народна", "xalq", "халқ", "халк"],
  lullabies: ["lullaby", "lullabies", "колыбельные", "колыбельная", "колискові", "колискова", "alla", "алла"]
} as const;
