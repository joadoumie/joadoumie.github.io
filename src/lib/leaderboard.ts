// localStorage-backed leaderboard. The README points to Supabase as the next
// step; for v1 we keep it local. Swap implementations here, not in the UI.

export type Score = {
  name: string;
  wpm: number;
  acc: number;
  when: string;
  pinned?: boolean;
};

export const LEADERBOARD_KEY = 'jordi.leaderboard.v1';

// jordi's PB always pinned at top, can't be displaced
export const PINNED: Score = {
  name: 'joadoumie',
  wpm: 129,
  acc: 99,
  when: 'personal best',
  pinned: true,
};

export function loadBoard(): Score[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    return raw ? (JSON.parse(raw) as Score[]) : [];
  } catch {
    return [];
  }
}

export function saveBoard(entries: Score[]): void {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch {
    // ignore (private browsing, etc.)
  }
}
