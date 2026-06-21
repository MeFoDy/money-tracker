/**
 * Shared helpers for resolving the active account filter from the URL.
 */

/**
 * Resolve the active account id from URL parameters, falling back to ''.
 * @param {URL} [url]
 * @returns {string}
 */
export function resolveAccountIdFromUrl(url = new URL(globalThis.location.href)) {
  return url.searchParams.get('accountId') || '';
}
