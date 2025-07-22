// src/parseCsv.js
// Robust parser for HUB "Data Usage Timeline" export
// Accepts comma, tab, or multi-space delimiters (it's often a .txt table)
// Ignores non-date lines. Returns [{day, gigabytes}, ...]

const DATE_LINE_RE = /^\s*(\d{4}-\d{2}-\d{2})\s+([\d,]+(?:\.\d+)?)\s*$/;

/**
 * Parse raw export text into [{day, gigabytes}]
 * @param {string} text
 * @returns {Array<{day: string, gigabytes: number}>}
 */
function parseOffloadCsv(text) {
  const rows = [];
  if (!text) return rows;

  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Quick header skip: "Day", "Gigabytes", etc.
    if (/^day\b/i.test(line)) continue;

    // Match "YYYY-MM-DD <whitespace> NNN"
    const m = line.match(DATE_LINE_RE);
    if (!m) continue;

    const day = m[1];
    const numRaw = m[2].replace(/,/g, '');
    const gb = Number(numRaw);
    if (!Number.isFinite(gb)) continue;

    rows.push({ day, gigabytes: gb });
  }

  return rows;
}

module.exports = { parseOffloadCsv };
