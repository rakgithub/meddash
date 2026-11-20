/** Up to two letters for an avatar: first letters of the first and last word ("Ana Weber" → "AW"). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  // Array.from splits by code point, so an emoji or other non-BMP first character stays whole.
  const first = (word: string) => Array.from(word)[0].toUpperCase();
  const firstWord = words[0];
  const lastWord = words[words.length - 1];
  return words.length === 1 ? first(firstWord) : first(firstWord) + first(lastWord);
}
