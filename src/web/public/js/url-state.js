/**
 * Shared helpers for synchronising the date and account filters with the URL.
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
 * Write the given account id into a URL's search params.
 * Mutates the provided URL object.
 * @param {URL} url
 * @param {string} accountId
 */
export function writeAccountIdToUrl(url, accountId) {
  if (accountId) url.searchParams.set('accountId', accountId);
  else url.searchParams.delete('accountId');
}

/**
 * Write the given category ids into a URL's search params.
 * Mutates the provided URL object.
 * @param {URL} url
 * @param {string[]} categoryIds
 */
export function writeCategoryIdsToUrl(url, categoryIds) {
  if (categoryIds && categoryIds.length > 0) url.searchParams.set('categoryIds', categoryIds.join(','));
  else url.searchParams.delete('categoryIds');
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
 * Replace the current URL's account id without adding a browser history entry.
 * @param {string} accountId
 */
export function replaceAccountIdInUrl(accountId) {
  const url = new URL(globalThis.location.href);
  writeAccountIdToUrl(url, accountId);
  globalThis.history.replaceState({}, '', url.toString());
}

/**
 * Replace the current URL's category ids without adding a browser history entry.
 * @param {string[]} categoryIds
 */
export function replaceCategoryIdsInUrl(categoryIds) {
  const url = new URL(globalThis.location.href);
  writeCategoryIdsToUrl(url, categoryIds);
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
 * Push a new URL with the given account id, creating a browser history entry.
 * @param {string} accountId
 */
export function pushAccountIdToUrl(accountId) {
  const url = new URL(globalThis.location.href);
  writeAccountIdToUrl(url, accountId);
  globalThis.history.pushState({}, '', url.toString());
}

/**
 * Push a new URL with the given category ids, creating a browser history entry.
 * @param {string[]} categoryIds
 */
export function pushCategoryIdsToUrl(categoryIds) {
  const url = new URL(globalThis.location.href);
  writeCategoryIdsToUrl(url, categoryIds);
  globalThis.history.pushState({}, '', url.toString());
}

/**
 * Build a new URL for navigating to a page while preserving the current filters.
 * @param {string} page
 * @param {{ from: string, to: string, accountId: string, categoryIds: string[] }} filters
 * @returns {URL}
 */
export function buildPageUrl(page, { from, to, accountId, categoryIds }) {
  const url = new URL(globalThis.location.href);
  url.searchParams.delete('period');
  url.searchParams.set('page', page);
  writeDateRangeToUrl(url, { from, to });
  writeAccountIdToUrl(url, accountId);
  writeCategoryIdsToUrl(url, categoryIds);
  return url;
}
