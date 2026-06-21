/**
 * Shared helpers for synchronising the `from`/`to` date filters with the URL.
 */

/**
 * Write the given date range into a URL's search params.
 * Mutates the provided URL object.
 * @param {URL} url
 * @param {{ from: string, to: string }} range
 */
export function writeDateRangeToUrl(url, { from, to }) {
  if (from) url.searchParams.set('from', from);
  else url.searchParams.delete('from');
  if (to) url.searchParams.set('to', to);
  else url.searchParams.delete('to');
}

/**
 * Replace the current URL's date range without adding a browser history entry.
 * @param {{ from: string, to: string }} range
 */
export function replaceDateRangeInUrl(range) {
  const url = new URL(globalThis.location.href);
  writeDateRangeToUrl(url, range);
  globalThis.history.replaceState({}, '', url.toString());
}

/**
 * Push a new URL with the given date range, creating a browser history entry.
 * @param {{ from: string, to: string }} range
 */
export function pushDateRangeToUrl(range) {
  const url = new URL(globalThis.location.href);
  writeDateRangeToUrl(url, range);
  globalThis.history.pushState({}, '', url.toString());
}

/**
 * Build a new URL for navigating to a page while preserving the current date range.
 * @param {string} page
 * @param {{ from: string, to: string }} range
 * @returns {URL}
 */
export function buildPageUrl(page, range) {
  const url = new URL(globalThis.location.href);
  url.searchParams.delete('period');
  url.searchParams.set('page', page);
  writeDateRangeToUrl(url, range);
  return url;
}
