export function cleanAmount(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replaceAll(/\s/g, '').replace(',', '.');
  const val = Number.parseFloat(cleaned);
  return Number.isNaN(val) ? null : val;
}
