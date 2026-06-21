/**
 * Shared helpers for resolving the active category filter from the URL.
 */

/**
 * Resolve the active category ids from URL parameters.
 * The special string "null" represents uncategorized transactions.
 * @param {URL} [url]
 * @returns {string[]}
 */
export function resolveCategoryIdsFromUrl(url = new URL(globalThis.location.href)) {
  const raw = url.searchParams.get('categoryIds');
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map(v => v.trim())
    .filter(v => v === 'null' || v !== '');
}
