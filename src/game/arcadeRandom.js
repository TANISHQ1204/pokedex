export function pickRandom(items, rng = Math.random) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items[Math.floor(rng() * items.length)];
}

export function shuffle(items, rng = Math.random) {
  const next = Array.isArray(items) ? [...items] : [];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function sample(items, count, rng = Math.random) {
  return shuffle(items, rng).slice(0, Math.max(0, Math.floor(Number(count) || 0)));
}
