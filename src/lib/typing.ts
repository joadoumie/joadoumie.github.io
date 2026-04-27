const WORD_BANK = (
  'the quick brown fox jumps over a lazy dog while the keyboard hums ' +
  'code is poetry compiled into reality and ships to production at midnight ' +
  'basketball is a quiet conversation between five players moving in rhythm ' +
  'open source is the closest thing software has to a public library ' +
  'shoot dribble pass cut screen rebound iterate refactor commit deploy ' +
  'every keystroke is a small bet that the next idea is worth catching'
).split(/\s+/);

export function makeWords(n: number): string {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]);
  return out.join(' ');
}

export function countCorrect(text: string, typed: string): number {
  let n = 0;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === text[i]) n++;
  }
  return n;
}

export function computeConsistency(history: number[]): number {
  if (history.length < 2) return 0;
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length;
  const stddev = Math.sqrt(variance);
  if (mean === 0) return 0;
  return Math.max(0, Math.round(100 - (stddev / mean) * 100));
}
