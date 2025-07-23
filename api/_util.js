// api/_util.js
function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Today minus n days (inclusive).
 * days=7 -> returns date string 7 days ago.
 */
function startDateFromDays(days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n + 1); // include today as day #1
  return isoDate(d);
}

function formatGigabytes(num) {
  const n = Number(num);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

module.exports = { isoDate, startDateFromDays, formatGigabytes };

