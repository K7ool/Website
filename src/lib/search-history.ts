const MAX_HISTORY = 20;

export interface SearchHistoryEntry {
  query: string;
  label?: string;
  timestamp: number;
}

function getStorageKey(type: string): string {
  return `finder_history_${type}`;
}

export function getHistory(type: string): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(type));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(type: string, query: string, label?: string): SearchHistoryEntry[] {
  const history = getHistory(type).filter((e) => e.query !== query);
  history.unshift({ query, label, timestamp: Date.now() });
  const trimmed = history.slice(0, MAX_HISTORY);
  localStorage.setItem(getStorageKey(type), JSON.stringify(trimmed));
  return trimmed;
}

export function removeFromHistory(type: string, query: string): SearchHistoryEntry[] {
  const history = getHistory(type).filter((e) => e.query !== query);
  localStorage.setItem(getStorageKey(type), JSON.stringify(history));
  return history;
}

export function clearHistory(type: string): void {
  localStorage.removeItem(getStorageKey(type));
}
