// Quantity formatting + US customary <-> metric display conversion.

export const SPICE_LABELS = ['No heat', 'Mild', 'Medium', 'Spicy', 'Very spicy', 'Fiery'];

export function spiceLabel(level) {
  return SPICE_LABELS[Math.max(0, Math.min(5, Number(level) || 0))];
}

const FRACTIONS = [
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
];

export function formatQty(q) {
  const n = Number(q);
  if (!isFinite(n) || n === 0) return '';
  const rounded = Math.round(n * 100) / 100;
  const whole = Math.floor(rounded + 1e-9);
  const frac = rounded - whole;
  let glyph = '';
  for (const [value, g] of FRACTIONS) {
    if (Math.abs(frac - value) < 0.03) {
      glyph = g;
      break;
    }
  }
  if (!glyph && frac > 0.02) return String(rounded);
  if (whole === 0) return glyph || String(rounded);
  return glyph ? `${whole}${glyph}` : String(whole);
}

const METRIC_PER_US = {
  oz: { unit: 'g', f: 28.3495 },
  lb: { unit: 'g', f: 453.592 },
  cup: { unit: 'ml', f: 240 },
  tbsp: { unit: 'ml', f: 15 },
  tsp: { unit: 'ml', f: 5 },
};

const US_PER_METRIC = {
  g: { unit: 'oz', f: 1 / 28.3495 },
  kg: { unit: 'lb', f: 2.20462 },
  ml: { unit: 'tbsp', f: 1 / 15 },
  L: { unit: 'cup', f: 1000 / 240 },
};

function tidy(q) {
  return Math.round(q * 100) / 100;
}

export function convertAmount(qty, unit, system) {
  const n = Number(qty);
  if (!isFinite(n) || n <= 0 || !unit) return { qty: n, unit: unit || '' };
  if (system === 'metric' && METRIC_PER_US[unit]) {
    let q = n * METRIC_PER_US[unit].f;
    let u = METRIC_PER_US[unit].unit;
    if (u === 'g' && q >= 1000) { q /= 1000; u = 'kg'; }
    return { qty: tidy(q), unit: u };
  }
  if (system === 'us' && US_PER_METRIC[unit]) {
    let q = n * US_PER_METRIC[unit].f;
    let u = US_PER_METRIC[unit].unit;
    if (u === 'oz' && q >= 16) { q /= 16; u = 'lb'; }
    if (u === 'tbsp') {
      if (q >= 16) { q /= 16; u = 'cup'; }
      else if (q < 1) { q *= 3; u = 'tsp'; }
    }
    return { qty: tidy(q), unit: u };
  }
  return { qty: n, unit };
}

export function formatAmount(qty, unit, system) {
  const converted = convertAmount(qty, unit, system);
  const qtyStr = converted.qty > 0 ? formatQty(converted.qty) : '';
  return [qtyStr, converted.unit].filter(Boolean).join(' ');
}

export function formatMinutes(mins) {
  const m = Number(mins) || 0;
  if (m <= 0) return '';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} hr ${rest} min` : `${h} hr`;
}
