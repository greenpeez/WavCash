import Papa from "papaparse";

export interface ParsedLine {
  isrc: string | null;
  track_title: string | null;
  platform: string | null;
  streams: number | null;
  earnings: number | null;
  period: string | null;
  country: string | null;
  // Publisher-specific fields (null for distributor CSVs)
  income_type: string | null;
  source_name: string | null;
  iswc: string | null;
  share_received: number | null;
  gross_earnings: number | null;
}

type CsvRow = Record<string, string>;

// Column mapping type — publisher-specific fields are empty arrays for distributors
interface ColumnMapping {
  isrc: string[];
  title: string[];
  platform: string[];
  streams: string[];
  earnings: string[];
  period: string[];
  country: string[];
  income_type: string[];
  source_name: string[];
  iswc: string[];
  share_received: string[];
  gross_earnings: string[];
}

// Base distributor fields (publisher-specific arrays empty)
const distributorDefaults = {
  income_type: [],
  source_name: [],
  iswc: [],
  share_received: [],
  gross_earnings: [],
};

const COLUMN_MAPS: Record<string, ColumnMapping> = {
  distrokid: {
    isrc: ["ISRC", "isrc"],
    title: ["Title", "Song", "Song Title", "title"],
    platform: ["Store", "Store Name", "store", "Platform"],
    streams: ["Quantity", "Streams", "Units", "quantity"],
    earnings: ["Earnings (USD)", "Total", "Net Amount", "earnings", "Earnings"],
    period: ["Reporting Month", "Sale Month", "Month", "Period", "reporting_month"],
    country: ["Country", "Territory", "country"],
    ...distributorDefaults,
  },
  tunecore: {
    isrc: ["ISRC", "isrc"],
    title: ["Release Title", "Title", "Song Title", "release_title"],
    platform: ["Store Name", "Store", "store_name", "Platform"],
    streams: ["Units", "Quantity", "Streams", "units"],
    earnings: ["Paid", "Revenue", "Earnings", "paid"],
    period: ["Sale Month", "Report Month", "sale_month", "Period"],
    country: ["Country", "Territory", "country"],
    ...distributorDefaults,
  },
  amuse: {
    isrc: ["ISRC", "isrc"],
    title: ["Track Title", "Title", "track_title"],
    platform: ["Store", "Service", "Platform", "store"],
    streams: ["Streams", "Units", "Quantity", "streams"],
    earnings: ["Revenue", "Earnings", "Amount", "revenue"],
    period: ["Period", "Month", "Reporting Period", "period"],
    country: ["Country", "Territory", "country"],
    ...distributorDefaults,
  },
  cd_baby: {
    isrc: ["ISRC", "isrc"],
    title: ["Title", "Track", "Song", "title"],
    platform: ["Store", "Vendor", "Platform", "store"],
    streams: ["Quantity", "Units", "Streams", "quantity"],
    earnings: ["Amount", "Subtotal", "Earnings", "amount"],
    period: ["Period", "Accounting Period", "Month", "period"],
    country: ["Country", "Territory", "country"],
    ...distributorDefaults,
  },
  amra: {
    isrc: ["RawISRC", "ISRC", "isrc"],
    title: ["SongTitle", "Song Title", "Title"],
    platform: ["Usage", "Platform", "Store"],
    streams: ["RawUnits", "Units", "Streams"],
    earnings: ["NetRoyalty", "Net Royalty", "Earnings"],
    period: ["DateFrom", "Date From", "Period"],
    country: ["TerritoryName", "Territory", "Country"],
    income_type: ["IncomeType", "Income Type"],
    source_name: ["SourceName", "Source Name", "Source"],
    iswc: ["RawISWC", "ISWC"],
    share_received: ["ShareReceived", "Share Received", "Share %"],
    gross_earnings: ["NetReceipt", "Net Receipt", "Gross"],
  },
  songtrust: {
    isrc: ["ISRC", "isrc"],
    title: ["Song Title", "Title", "Song", "Work Title"],
    platform: ["Source", "Platform", "Service"],
    streams: ["Units", "Quantity", "Streams"],
    earnings: ["Net Amount", "Net Royalty", "Amount", "Earnings"],
    period: ["Period", "Period From", "Statement Period"],
    country: ["Territory", "Country"],
    income_type: ["Income Type", "Royalty Type", "Type"],
    source_name: ["Source", "Society", "Collection Society"],
    iswc: ["ISWC", "iswc"],
    share_received: ["Share %", "Share", "Ownership %", "Your Share"],
    gross_earnings: ["Gross Amount", "Gross", "Gross Royalty"],
  },
  tunecore_publishing: {
    isrc: ["Catalog", "ISRC", "isrc"],
    title: ["Title", "Song Title", "Work Title"],
    platform: ["Source Name", "Source", "Platform"],
    streams: ["Units", "Quantity"],
    earnings: ["Amount Due", "Earnings", "Net Amount"],
    period: ["Period From", "Period", "Statement Period"],
    country: ["Territory", "Country"],
    income_type: ["Income Type", "Royalty Type", "Type"],
    source_name: ["Source Name", "Source", "Society"],
    iswc: ["ISWC", "iswc"],
    share_received: ["Share", "Share (%)", "% Received", "Contractual Rate"],
    gross_earnings: ["Gross Amount", "Gross"],
  },
  bmi: {
    isrc: ["ISRC", "isrc"],
    title: ["Song Title", "Title", "Work Title"],
    platform: ["Source", "Medium", "Platform"],
    streams: ["Units", "Performances", "Quantity"],
    earnings: ["Royalty Amount", "Amount", "Earnings", "Net Amount"],
    period: ["Period", "Quarter", "Statement Period"],
    country: ["Territory", "Country"],
    income_type: ["Royalty Type", "Income Type", "Type", "Performance Type"],
    source_name: ["Source Code", "Source", "Licensee"],
    iswc: ["ISWC", "iswc"],
    share_received: ["Share %", "Writer Share", "Share"],
    gross_earnings: ["Gross Amount", "Gross"],
  },
  ascap: {
    isrc: ["ISRC", "isrc"],
    title: ["Title", "Work Title", "Song Title"],
    platform: ["Source", "Medium", "Platform"],
    streams: ["Performances", "Units", "Quantity"],
    earnings: ["Domestic Dollars", "Amount", "Earnings", "Net Amount", "Foreign Dollars"],
    period: ["Period", "Quarter", "Statement Period"],
    country: ["Territory", "Country"],
    income_type: ["Income Type", "Royalty Type", "Type", "Use"],
    source_name: ["Source", "Licensee", "Society"],
    iswc: ["ISWC", "iswc"],
    share_received: ["Share", "Writer Share", "Share %"],
    gross_earnings: ["Gross", "Gross Amount"],
  },
  other_publisher: {
    isrc: ["ISRC", "isrc"],
    title: ["Song Title", "Title", "Work Title", "Track Title", "Song"],
    platform: ["Source", "Platform", "Service", "Medium", "Usage"],
    streams: ["Units", "Quantity", "Streams", "Performances"],
    earnings: ["Net Amount", "Amount", "Earnings", "Net Royalty", "Royalty Amount", "Amount Due"],
    period: ["Period", "Period From", "Statement Period", "Quarter", "Date From"],
    country: ["Territory", "Country", "Territory Name"],
    income_type: ["Income Type", "Royalty Type", "Type", "Use"],
    source_name: ["Source", "Source Name", "Society", "Collection Society", "Licensee"],
    iswc: ["ISWC", "iswc"],
    share_received: ["Share %", "Share", "Writer Share", "Ownership %", "Your Share"],
    gross_earnings: ["Gross Amount", "Gross", "Gross Royalty", "Net Receipt"],
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
  if (lower.includes("deezer")) return "deezer";
  if (lower.includes("audiomack")) return "audiomack";
  if (lower.includes("tiktok") || lower.includes("tik tok")) return "tiktok";
  if (lower.includes("anghami")) return "anghami";
  if (lower.includes("vevo")) return "vevo";
  if (lower.includes("iheart") || lower.includes("i heart")) return "iheart";
  if (lower.includes("pandora")) return "pandora";
  if (lower.includes("meta") || lower.includes("facebook") || lower.includes("instagram")) return "meta";
  if (lower.includes("soundcloud")) return "soundcloud";
  return raw.trim();
}

function normalizeIncomeType(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();

  // AMRA formats
  if (lower === "mechanical - streaming") return "mechanical_streaming";
  if (lower === "performance - streaming") return "performance_streaming";
  if (lower === "mechanical - youtube") return "mechanical_youtube";
  if (lower === "performance - youtube") return "performance_youtube";
  if (lower === "mechanical - online") return "mechanical_online";
  if (lower === "performance - online") return "performance_online";

  // TuneCore Publishing formats
  if (lower === "streaming mechanical") return "mechanical_streaming";
  if (lower === "streaming performance") return "performance_streaming";
  if (lower === "digital download (mechanical)") return "mechanical_download";
  if (lower === "digital download (performance)") return "performance_download";
  if (lower === "synchronization" || lower === "sync") return "synchronization";
  if (lower === "ringtone mechanical") return "mechanical_ringtone";
  if (lower === "ringtone performance") return "performance_ringtone";

  // BMI formats
  if (lower === "mechanical performance") return "mechanical_performance";
  if (lower === "streaming-performance") return "performance_streaming";
  if (lower === "streaming-mechanical") return "mechanical_streaming";
  if (lower === "general licensing") return "general_licensing";
  if (lower === "digital audio services") return "digital_audio";
  if (lower === "internet - streaming") return "performance_streaming";

  // ASCAP formats
  if (lower === "audio feature") return "performance_audio";
  if (lower === "audio visual feature") return "performance_av";
  if (lower === "interactive streaming") return "performance_streaming";
  if (lower === "non-interactive streaming") return "performance_non_interactive";

  // Exact matches
  if (lower === "mechanical") return "mechanical";
  if (lower === "performance") return "performance";
  if (lower === "publishing") return "publishing";

  // Broad fallbacks
  if (lower.includes("mechanical")) return "mechanical";
  if (lower.includes("performance")) return "performance";
  if (lower.includes("sync")) return "synchronization";

  // Last resort: normalize to snake_case
  return lower.replace(/\s*-\s*/g, "_").replace(/\s+/g, "_");
}

function normalizeSourceName(raw: string | null): string | null {
  if (!raw) return null;
  return raw.trim().toLowerCase();
}

/** Sources that are publishers (not distributors) */
const PUBLISHER_SOURCES = [
  "amra",
  "songtrust",
  "tunecore_publishing",
  "bmi",
  "ascap",
  "other_publisher",
];

export function isPublisherSource(distributor: string): boolean {
  return PUBLISHER_SOURCES.includes(distributor.toLowerCase());
}

export function parseStatementCsv(
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
    // Publisher-specific fields (null for distributor CSVs with empty column arrays)
    income_type: normalizeIncomeType(findColumn(row, mapping.income_type)),
    source_name: normalizeSourceName(findColumn(row, mapping.source_name)),
    iswc: findColumn(row, mapping.iswc),
    share_received: parseNumber(findColumn(row, mapping.share_received)),
    gross_earnings: parseNumber(findColumn(row, mapping.gross_earnings)),
  }));

  // If this is a publisher source but the CSV had no income_type column,
  // backfill with a generic "publishing" type so downstream logic
  // correctly identifies these as publisher lines.
  if (isPublisherSource(distributor)) {
    const hasAnyIncomeType = lines.some((l) => l.income_type !== null);
    if (!hasAnyIncomeType) {
      for (const line of lines) {
        line.income_type = "publishing";
      }
    }
  }

  // Filter out rows with no meaningful data
  const validLines = lines.filter(
    (l) => l.isrc || l.track_title || l.earnings
  );

  return { lines: validLines, errors };
}
