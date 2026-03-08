import Papa from "papaparse";

export interface ParsedLine {
  isrc: string | null;
  track_title: string | null;
  platform: string | null;
  streams: number | null;
  earnings: number | null;
  period: string | null;
  country: string | null;
}

type CsvRow = Record<string, string>;

// Distributor-specific column mappings
const COLUMN_MAPS: Record<string, {
  isrc: string[];
  title: string[];
  platform: string[];
  streams: string[];
  earnings: string[];
  period: string[];
  country: string[];
}> = {
  distrokid: {
    isrc: ["ISRC", "isrc"],
    title: ["Title", "Song", "Song Title", "title"],
    platform: ["Store", "Store Name", "store", "Platform"],
    streams: ["Quantity", "Streams", "Units", "quantity"],
    earnings: ["Earnings (USD)", "Total", "Net Amount", "earnings", "Earnings"],
    period: ["Reporting Month", "Sale Month", "Month", "Period", "reporting_month"],
    country: ["Country", "Territory", "country"],
  },
  tunecore: {
    isrc: ["ISRC", "isrc"],
    title: ["Release Title", "Title", "Song Title", "release_title"],
    platform: ["Store Name", "Store", "store_name", "Platform"],
    streams: ["Units", "Quantity", "Streams", "units"],
    earnings: ["Paid", "Revenue", "Earnings", "paid"],
    period: ["Sale Month", "Report Month", "sale_month", "Period"],
    country: ["Country", "Territory", "country"],
  },
  amuse: {
    isrc: ["ISRC", "isrc"],
    title: ["Track Title", "Title", "track_title"],
    platform: ["Store", "Service", "Platform", "store"],
    streams: ["Streams", "Units", "Quantity", "streams"],
    earnings: ["Revenue", "Earnings", "Amount", "revenue"],
    period: ["Period", "Month", "Reporting Period", "period"],
    country: ["Country", "Territory", "country"],
  },
  cd_baby: {
    isrc: ["ISRC", "isrc"],
    title: ["Title", "Track", "Song", "title"],
    platform: ["Store", "Vendor", "Platform", "store"],
    streams: ["Quantity", "Units", "Streams", "quantity"],
    earnings: ["Amount", "Subtotal", "Earnings", "amount"],
    period: ["Period", "Accounting Period", "Month", "period"],
    country: ["Country", "Territory", "country"],
  },
};

function findColumn(row: CsvRow, candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (row[candidate] !== undefined) return row[candidate];
  }
  // Try case-insensitive
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const found = keys.find((k) => k.toLowerCase() === candidate.toLowerCase());
    if (found) return row[found];
  }
  return null;
}

function parseNumber(val: string | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[,$]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function normalizePlatform(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (lower.includes("spotify")) return "spotify";
  if (lower.includes("apple") || lower.includes("itunes")) return "apple_music";
  if (lower.includes("youtube") || lower.includes("yt")) return "youtube_music";
  if (lower.includes("amazon")) return "amazon_music";
  if (lower.includes("tidal")) return "tidal";
  return raw.trim();
}

export function parseDistributorCsv(
  csvText: string,
  distributor: string
): { lines: ParsedLine[]; errors: string[] } {
  const errors: string[] = [];
  const mapping = COLUMN_MAPS[distributor] || COLUMN_MAPS.distrokid;

  const result = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    errors.push(...result.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`));
  }

  const lines: ParsedLine[] = result.data.map((row) => ({
    isrc: findColumn(row, mapping.isrc),
    track_title: findColumn(row, mapping.title),
    platform: normalizePlatform(findColumn(row, mapping.platform)),
    streams: parseNumber(findColumn(row, mapping.streams)),
    earnings: parseNumber(findColumn(row, mapping.earnings)),
    period: findColumn(row, mapping.period),
    country: findColumn(row, mapping.country),
  }));

  // Filter out rows with no meaningful data
  const validLines = lines.filter(
    (l) => l.isrc || l.track_title || l.earnings
  );

  return { lines: validLines, errors };
}
