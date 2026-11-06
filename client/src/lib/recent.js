const KEY = 'lumi_recent_products';

export function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function pushRecent(id) {
  const list = [id, ...getRecent().filter((x) => x !== id)].slice(0, 12);
  localStorage.setItem(KEY, JSON.stringify(list));
}
