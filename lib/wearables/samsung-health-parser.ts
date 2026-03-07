/// lib/wearables/samsung-health-parser.ts
// Client-side parser for Samsung Health exported ZIP files.
// Extracts steps, heart rate, sleep stages, HRV, SpO2, and calories.

export interface SamsungHealthSummary {
  date: string;               // YYYY-MM-DD (most recent day found across all files)
  steps?: number;
  heartRateResting?: number;
  heartRateAvg?: number;
  heartRateMax?: number;
  hrvRmssd?: number;
  sleepTotalMinutes?: number;
  sleepRemMinutes?: number;
  sleepDeepMinutes?: number;
  sleepLightMinutes?: number;
  spo2?: number;
  activeCalories?: number;
}

// Samsung Health file name patterns (the ZIP contains one CSV per data type)
const FILE_PATTERNS = {
  steps:      /com\.samsung\.shealth\.step_daily_trend/i,
  heartRate:  /com\.samsung\.shealth\.heart_rate/i,
  sleep:      /com\.samsung\.shealth\.sleep(?!_stage)/i,
  sleepStage: /com\.samsung\.shealth\.sleep_stage/i,
  spo2:       /com\.samsung\.shealth\.oxygen_saturation/i,
  hrv:        /com\.samsung\.shealth\.hrv/i,
  calories:   /com\.samsung\.shealth\.calories_burned/i,
} as const;

// Samsung Health CSVs have metadata/comment rows before the data.
// This parser skips lines starting with '#', then finds the first "header" line
// by looking for the row immediately before the first date-like data row.
function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
  if (lines.length < 2) return [];

  // Find the header row: the line immediately before the first line that starts with a date
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    if (/^\d{4}-\d{2}-\d{2}/.test(lines[i])) {
      headerIdx = Math.max(0, i - 1);
      break;
    }
  }

  const headers = lines[headerIdx]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  const rows: Record<string, string>[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.length < 2) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ""; });
    rows.push(row);
  }
  return rows;
}

function toNum(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

function findCol(row: Record<string, string>, ...candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const found = keys.find((k) => k.includes(candidate));
    if (found) return found;
  }
  return undefined;
}

function mostRecentDate(rows: Record<string, string>[], dateKey: string): string | null {
  const dates = rows
    .map((r) => r[dateKey]?.substring(0, 10))
    .filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d));
  return dates.length ? dates.sort().reverse()[0] : null;
}

export async function parseSamsungHealthZip(file: File): Promise<SamsungHealthSummary> {
  // Lazy-load jszip (only needed client-side)
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(file);

  const summary: SamsungHealthSummary = { date: new Date().toISOString().substring(0, 10) };
  const fileNames = Object.keys(zip.files);

  async function readFile(pattern: RegExp): Promise<string | null> {
    const name = fileNames.find((n) => pattern.test(n) && !zip.files[n].dir);
    return name ? zip.files[name].async("string") : null;
  }

  // ── Steps ────────────────────────────────────────────────────────────────────
  const stepsRaw = await readFile(FILE_PATTERNS.steps);
  if (stepsRaw) {
    const rows = parseCSV(stepsRaw);
    if (rows.length) {
      const dateCol = findCol(rows[0], "date", "day", "start_time") ?? "date";
      const recent = mostRecentDate(rows, dateCol);
      if (recent) summary.date = recent;
      const todayRow = rows.find((r) => r[dateCol]?.startsWith(summary.date));
      if (todayRow) {
        const countCol = findCol(todayRow, "count", "step") ?? "count";
        summary.steps = toNum(todayRow[countCol]);
      }
    }
  }

  // ── Heart Rate ───────────────────────────────────────────────────────────────
  const hrRaw = await readFile(FILE_PATTERNS.heartRate);
  if (hrRaw) {
    const rows = parseCSV(hrRaw);
    if (rows.length) {
      const dateCol = findCol(rows[0], "start_time", "date", "time") ?? "start_time";
      const hrCol   = findCol(rows[0], "heart_rate", "bpm", "rate") ?? "heart_rate";
      const todayRows = rows.filter((r) => r[dateCol]?.startsWith(summary.date));
      if (todayRows.length) {
        const vals = todayRows.map((r) => toNum(r[hrCol])).filter((v): v is number => v !== undefined);
        if (vals.length) {
          summary.heartRateAvg      = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
          summary.heartRateMax      = Math.max(...vals);
          summary.heartRateResting  = Math.min(...vals);
        }
      }
    }
  }

  // ── Sleep (total duration) ───────────────────────────────────────────────────
  const sleepRaw = await readFile(FILE_PATTERNS.sleep);
  if (sleepRaw) {
    const rows = parseCSV(sleepRaw);
    if (rows.length) {
      const dateCol = findCol(rows[0], "start", "date", "time") ?? "start_time";
      const durCol  = findCol(rows[0], "duration", "total") ?? "duration";
      // Fall back to latest row if today not found
      const todayRow = rows.find((r) => r[dateCol]?.startsWith(summary.date)) ?? rows[rows.length - 1];
      if (todayRow) {
        const dur = toNum(todayRow[durCol]);
        if (dur != null) {
          // Samsung Health stores duration in milliseconds; guard for minutes
          summary.sleepTotalMinutes = dur > 10_000 ? Math.round(dur / 60_000) : Math.round(dur);
        }
      }
    }
  }

  // ── Sleep Stages ─────────────────────────────────────────────────────────────
  const sleepStageRaw = await readFile(FILE_PATTERNS.sleepStage);
  if (sleepStageRaw) {
    const rows = parseCSV(sleepStageRaw);
    if (rows.length) {
      const dateCol  = findCol(rows[0], "start", "date", "time") ?? "start_time";
      const stageCol = findCol(rows[0], "stage", "type", "sleep_type") ?? "stage";
      const durCol   = findCol(rows[0], "duration") ?? "duration";
      const todayRows = rows.filter((r) => r[dateCol]?.startsWith(summary.date));
      let remMs = 0, deepMs = 0, lightMs = 0;
      for (const row of todayRows) {
        const stage = row[stageCol]?.toLowerCase() ?? "";
        const dur   = toNum(row[durCol]) ?? 0;
        // Stage codes: 40001=REM, 40002=Light, 40003=Deep, or text
        if (stage.includes("rem") || stage === "40001") remMs   += dur;
        else if (stage.includes("deep") || stage === "40003")  deepMs  += dur;
        else if (stage.includes("light") || stage === "40002") lightMs += dur;
      }
      if (remMs)   summary.sleepRemMinutes   = Math.round(remMs   / 60_000);
      if (deepMs)  summary.sleepDeepMinutes  = Math.round(deepMs  / 60_000);
      if (lightMs) summary.sleepLightMinutes = Math.round(lightMs / 60_000);
    }
  }

  // ── SpO2 ─────────────────────────────────────────────────────────────────────
  const spo2Raw = await readFile(FILE_PATTERNS.spo2);
  if (spo2Raw) {
    const rows = parseCSV(spo2Raw);
    if (rows.length) {
      const dateCol = findCol(rows[0], "start_time", "date", "time") ?? "start_time";
      const spo2Col = findCol(rows[0], "spo2", "oxygen", "saturation") ?? "spo2";
      const todayRows = rows.filter((r) => r[dateCol]?.startsWith(summary.date));
      if (todayRows.length) {
        const vals = todayRows.map((r) => toNum(r[spo2Col])).filter((v): v is number => v !== undefined);
        if (vals.length) {
          summary.spo2 = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
        }
      }
    }
  }

  // ── HRV ──────────────────────────────────────────────────────────────────────
  const hrvRaw = await readFile(FILE_PATTERNS.hrv);
  if (hrvRaw) {
    const rows = parseCSV(hrvRaw);
    if (rows.length) {
      const dateCol = findCol(rows[0], "start_time", "date", "time") ?? "start_time";
      const hrvCol  = findCol(rows[0], "hrv", "rmssd") ?? "hrv";
      const todayRows = rows.filter((r) => r[dateCol]?.startsWith(summary.date));
      if (todayRows.length) {
        const vals = todayRows.map((r) => toNum(r[hrvCol])).filter((v): v is number => v !== undefined);
        if (vals.length) {
          summary.hrvRmssd = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
        }
      }
    }
  }

  // ── Calories ─────────────────────────────────────────────────────────────────
  const calRaw = await readFile(FILE_PATTERNS.calories);
  if (calRaw) {
    const rows = parseCSV(calRaw);
    if (rows.length) {
      const dateCol = findCol(rows[0], "date", "day", "start_time") ?? "date";
      const calCol  = findCol(rows[0], "calorie", "calories", "burned") ?? "calorie";
      const todayRow = rows.find((r) => r[dateCol]?.startsWith(summary.date));
      if (todayRow) summary.activeCalories = toNum(todayRow[calCol]);
    }
  }

  return summary;
}
