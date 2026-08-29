/**
 * MAMADO — motivational quotes.
 * Short, technical, developer-oriented. One is highlighted per day
 * (deterministic), with manual shuffle + local favorites.
 */
export interface Quote {
  text: string;
  author?: string;
}

export const QUOTES: Quote[] = [
  { text: "Build something worth remembering." },
  { text: "Ship it. Perfect is a moving target.", author: "engineering lore" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "The best code is no code at all.", author: "Jeff Atwood" },
  { text: "Focus is deciding what NOT to do.", author: "anonymous" },
  { text: "Small daily compounding beats heroic bursts." },
  { text: "Deep work is the new IQ.", author: "Cal Newport (paraphrased)" },
  { text: "Done is better than perfect — but done well beats both." },
  { text: "Programs must be written for people to read.", author: "Harold Abelson" },
  { text: "A goal without a deadline is a wish." },
  { text: "Move slowly with intention; arrive faster." },
  { text: "Your future self is your user. Design for them." },
  { text: "Every expert was once a beginner at 2 AM." },
  { text: "Stay curious. Stay dangerous.", author: "terminal wisdom" },
];

/** Deterministic quote for a given day (same all day, changes at midnight). */
export function quoteOfTheDay(date: Date = new Date()): Quote {
  const key = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return QUOTES[h % QUOTES.length]!;
}

const FAV_KEY = "mamado.quote.favorites";

export function loadFavoriteQuotes(): number[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function saveFavoriteQuotes(ids: number[]) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids));
  } catch {
    /* private mode */
  }
}
