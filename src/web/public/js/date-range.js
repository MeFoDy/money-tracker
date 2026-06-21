/** Month covered by the default date range when no URL value is present. */
const DEFAULT_MONTH_SPAN = 2;

/**
 * Format a local Date as YYYY-MM-DD.
 * @param {Date} date
 * @returns {string}
 */
function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compute the default date range: from the first day of N months ago to today.
 * Uses local dates to avoid timezone shifts.
 * @returns {{ from: string, to: string }} ISO-like YYYY-MM-DD strings.
 */
export function getDefaultDateRange() {
  const now = new Date();
  const to = formatIsoDate(now);
  const from = formatIsoDate(new Date(now.getFullYear(), now.getMonth() - DEFAULT_MONTH_SPAN, 1));
  return { from, to };
}

/**
 * Resolve an absolute date range from URL parameters, falling back to defaults.
 * @param {URL} [url]
 * @returns {{ from: string, to: string }}
 */
export function resolveDateRangeFromUrl(url = new URL(globalThis.location.href)) {
  const { from: defaultFrom, to: defaultTo } = getDefaultDateRange();
  const from = url.searchParams.get('from') || defaultFrom;
  const to = url.searchParams.get('to') || defaultTo;
  return { from, to };
}

/**
 * Compute a date range for a named dashboard period.
 * @param {string} period
 * @param {(opts?: object) => Promise<{min?: string, max?: string}>} fetchDateRange
 * @returns {Promise<{ from: string, to: string }>}
 */
export async function computePeriodRange(period, fetchDateRange) {
  const now = new Date();
  const today = formatIsoDate(now);

  switch (period) {
    case 'month': {
      const from = formatIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()));
      return { from, to: today };
    }
    case 'all': {
      const range = await fetchDateRange();
      return { from: range.min || '', to: range.max || '' };
    }
    case 'custom': {
      throw new Error('computePeriodRange should not be called for custom period');
    }
    default: {
      const from = formatIsoDate(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()));
      return { from, to: today };
    }
  }
}
