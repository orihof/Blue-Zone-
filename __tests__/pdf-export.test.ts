/// __tests__/pdf-export.test.ts

// ─── Mocks (hoisted before imports) ──────────────────────────────────────────

jest.mock("jspdf");
jest.mock("@/lib/supabase/admin");
jest.mock("next-auth",            () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth",           () => ({ authOptions: {} }));
jest.mock("@/middleware/requireConsent", () => ({
  // Strips the consent wrapper so the raw handler is exported as POST
  requireConsent: () => (handler: (req: unknown) => unknown) => handler,
}));
jest.mock("@/lib/personal-baselines", () => ({
  getBaselineContext: jest.fn().mockResolvedValue([]),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { jsPDF }          from "jspdf";
import { getAdminClient } from "@/lib/supabase/admin";
import { getServerSession } from "next-auth";
import {
  buildProtocolPDFContent,
  savePDFToStorage,
  type ProtocolPDFData,
} from "@/lib/pdf-templates";
import { POST } from "@/app/api/export/pdf/route";
import type { NextRequest } from "next/server";
import type { CompetitionResult } from "@/lib/nutrient-competition";
import type { CriticalValueEvent } from "@/lib/types/health";

// ─── Typed mocks ──────────────────────────────────────────────────────────────

const MockJsPDF         = jest.mocked(jsPDF);
const mockGetAdminClient = jest.mocked(getAdminClient);
const mockSession        = jest.mocked(getServerSession);

// ─── jsPDF mock instance factory ─────────────────────────────────────────────

type MockInstance = {
  internal:         { pageSize: { getWidth: () => number; getHeight: () => number } };
  getNumberOfPages: jest.Mock;
  setFontSize:      jest.Mock;
  setFont:          jest.Mock;
  setTextColor:     jest.Mock;
  setFillColor:     jest.Mock;
  setDrawColor:     jest.Mock;
  setLineWidth:     jest.Mock;
  text:             jest.Mock;
  roundedRect:      jest.Mock;
  line:             jest.Mock;
  addPage:          jest.Mock;
  setPage:          jest.Mock;
  splitTextToSize:  jest.Mock;
  output:           jest.Mock;
};

function makeMockInstance(): MockInstance {
  return {
    internal: {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
    },
    getNumberOfPages: jest.fn(() => 1),
    setFontSize:      jest.fn(),
    setFont:          jest.fn(),
    setTextColor:     jest.fn(),
    setFillColor:     jest.fn(),
    setDrawColor:     jest.fn(),
    setLineWidth:     jest.fn(),
    text:             jest.fn(),
    roundedRect:      jest.fn(),
    line:             jest.fn(),
    addPage:          jest.fn(),
    setPage:          jest.fn(),
    splitTextToSize:  jest.fn((s: string) => [s]),
    output:           jest.fn(() => new ArrayBuffer(8)),
  };
}

/** Collect all first-args passed to doc.text() across the test */
function capturedText(instance: MockInstance): string[] {
  return (instance.text as jest.Mock).mock.calls.flatMap((args: unknown[]) => {
    const first = args[0];
    return Array.isArray(first) ? (first as string[]) : [first as string];
  });
}

// ─── DB chain helper (matches pattern in other test files) ───────────────────

type ChainResult = { data?: unknown; error?: null | { message: string } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeChain(result: ChainResult): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "is", "not", "in", "gte", "lte", "gt", "lt",
    "ilike", "like", "order", "limit", "maybeSingle", "single",
    "filter", "match", "contains",
  ];
  for (const m of methods) chain[m] = jest.fn().mockReturnValue(chain);
  chain.then    = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  chain.catch   = (rej: (v: unknown) => unknown) => Promise.resolve(result).catch(rej);
  chain.finally = (cb: () => void)               => Promise.resolve(result).finally(cb);
  return chain;
}

function setupDb(chains: ReturnType<typeof makeChain>[]) {
  const db = { from: jest.fn() };
  for (const chain of chains) (db.from as jest.Mock).mockReturnValueOnce(chain);
  mockGetAdminClient.mockReturnValue(db as never);
  return db;
}

// ─── Request factory for API route tests ─────────────────────────────────────

function makeReq(body: unknown): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
    nextUrl: { pathname: "/api/export/pdf" },
  } as unknown as NextRequest;
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const BASE_DATA: ProtocolPDFData = {
  userName:      "Alice",
  generatedDate: "1 January 2026",
  biologicalAge: 32,
  biomarkers: [
    { name: "Vitamin D", value: 28, unit: "ng/mL", status: "low" },
    { name: "Ferritin",  value: 12, unit: "ng/mL", status: "low" },
  ],
  recommendations: [
    { product: "Vitamin D3", dose: "2000 IU", timing: "Morning", reason: "Deficiency noted." },
  ],
  timingSchedule: [
    { time: "Morning", products: ["Vitamin D3"], notes: ["Take with food"] },
  ],
  competitionResults: [
    {
      nutrient_a: "Calcium", nutrient_b: "Zinc", competition_type: "absorption",
      clinical_significance: "moderate", action: "separate_timing",
      timing_separation_hours: 2, user_message: "Separate calcium and zinc by 2 hours.",
      mitigation_strategy: "Take zinc in morning, calcium at night.",
    },
    {
      nutrient_a: "Iron", nutrient_b: "Calcium", competition_type: "absorption",
      clinical_significance: "high", action: "separate_timing",
      timing_separation_hours: 3, user_message: "Iron absorption reduced by calcium.",
      mitigation_strategy: "Do not take together.",
    },
    {
      nutrient_a: "Magnesium", nutrient_b: "Vitamin D", competition_type: "synergy",
      clinical_significance: "critical", action: "suggest_pairing",
      user_message: "Vitamin D requires magnesium for activation.",
      mitigation_strategy: "Always co-administer.",
    },
  ] as unknown as CompetitionResult[],
};

// ─── Reset ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  MockJsPDF.mockClear();
  MockJsPDF.mockImplementation(() => makeMockInstance() as unknown as jsPDF);
  mockGetAdminClient.mockReset();
  mockSession.mockReset();
});

// ─── Tests 1–5: buildProtocolPDFContent ──────────────────────────────────────

describe("buildProtocolPDFContent", () => {
  test("1 — returns object with all required sections present", () => {
    const result = buildProtocolPDFContent(BASE_DATA);

    expect(result).toBeTruthy();
    expect(typeof (result as unknown as { output: unknown }).output).toBe("function");

    const inst = MockJsPDF.mock.results[0].value as MockInstance;
    const text  = capturedText(inst);

    // All section banners should have been rendered (sectionBanner calls text with UPPERCASE title)
    expect(text).toContain("BIOMARKER SUMMARY");
    expect(text).toContain("PROTOCOL RECOMMENDATIONS");
    expect(text).toContain("DAILY TIMING SCHEDULE");
    expect(text).toContain("NUTRIENT INTERACTIONS");
    expect(text).toContain("IMPORTANT DISCLAIMERS");
  });

  test("2 — pregnancy_disclaimer included when present in input", () => {
    const data: ProtocolPDFData = {
      ...BASE_DATA,
      pregnancy_disclaimer: "Consult your OB/GYN before taking any supplement during pregnancy.",
    };
    buildProtocolPDFContent(data);

    const inst = MockJsPDF.mock.results[0].value as MockInstance;
    const text  = capturedText(inst);

    // splitTextToSize returns [str] so the disclaimer string appears verbatim with "⚠ " prefix
    expect(text.some((t) => t.includes("Consult your OB/GYN"))).toBe(true);
  });

  test("3 — pregnancy_disclaimer absent when not in input", () => {
    buildProtocolPDFContent(BASE_DATA); // no pregnancy_disclaimer

    const inst = MockJsPDF.mock.results[0].value as MockInstance;
    const text  = capturedText(inst);

    expect(text.some((t) => t.includes("OB/GYN") || t.includes("pregnancy"))).toBe(false);
  });

  test("4 — only high and critical competition_conflicts included in PDF", () => {
    buildProtocolPDFContent(BASE_DATA);

    const inst = MockJsPDF.mock.results[0].value as MockInstance;
    const text  = capturedText(inst);

    // 'moderate' conflict (Calcium + Zinc) should NOT appear in Nutrient Interactions section
    expect(text.some((t) => t.includes("Calcium") && t.includes("Zinc") && t.includes("MODERATE"))).toBe(false);

    // 'high' conflict (Iron + Calcium) SHOULD appear
    expect(text.some((t) => t.includes("Iron") && t.includes("Calcium") && t.includes("HIGH"))).toBe(true);

    // 'critical' conflict (Magnesium + Vitamin D) SHOULD appear
    expect(text.some((t) => t.includes("Magnesium") && t.includes("Vitamin D") && t.includes("CRITICAL"))).toBe(true);
  });

  test("5 — critical_events section present when events passed", () => {
    const criticalEvents: CriticalValueEvent[] = [
      {
        id:                    "evt-1",
        user_id:               "user-1",
        marker_name:           "TSH",
        observed_value:        0.02,
        threshold_triggered:   "critical_low",
        threshold_value:       0.1,
        biomarker_result_id:   "bm-1",
        alerted_at:            new Date().toISOString(),
        user_acknowledged_at:  null,
        practitioner_alerted:  false,
        protocol_gated:        false,
        resolved_at:           null,
        notes:                 null,
      },
    ];

    buildProtocolPDFContent({ ...BASE_DATA, criticalEvents });

    const inst = MockJsPDF.mock.results[0].value as MockInstance;
    const text  = capturedText(inst);

    expect(text).toContain("CRITICAL FLAGS");
    expect(text.some((t) => t.includes("TSH"))).toBe(true);
  });
});

// ─── Test 6: savePDFToStorage ─────────────────────────────────────────────────

describe("savePDFToStorage", () => {
  test("6 — inserts row to protocol_pdf_exports with correct pdf_url and snapshot_id", async () => {
    const uploadMock       = jest.fn().mockResolvedValue({ error: null });
    const getPublicUrlMock = jest.fn().mockReturnValue({
      data: { publicUrl: "https://cdn.example.com/storage/v1/object/public/pdf-exports/user-1/snap-1/123.pdf" },
    });
    const insertMock = jest.fn().mockResolvedValue({ error: null });

    const db = {
      from:    jest.fn((table: string) => {
        if (table === "protocol_pdf_exports") return { insert: insertMock };
        return makeChain({ error: null });
      }),
      storage: { from: jest.fn(() => ({ upload: uploadMock, getPublicUrl: getPublicUrlMock })) },
    };
    mockGetAdminClient.mockReturnValue(db as never);

    const buffer = Buffer.from("fake-pdf-bytes");
    const result = await savePDFToStorage("user-1", buffer, "snap-1");

    // Storage upload called with path matching {userId}/{snapshotId}/
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/snap-1\//),
      buffer,
      expect.objectContaining({ contentType: "application/pdf" }),
    );

    // DB insert called with snapshot_id and pdf_url
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot_id: "snap-1",
        pdf_url:     expect.stringContaining("pdf-exports"),
      }),
    );

    expect(typeof result).toBe("string");
  });
});

// ─── Tests 7–8: POST /api/export/pdf ─────────────────────────────────────────

describe("POST /api/export/pdf", () => {
  const VALID_SESSION = { user: { id: "user-1", name: "Alice", email: "alice@example.com" } };

  test("7 — missing protocol_snapshot_id returns 400", async () => {
    mockSession.mockResolvedValue(VALID_SESSION as never);

    const req = makeReq({});          // no protocol_snapshot_id
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/protocol_snapshot_id/i);
  });

  test("8 — snapshot belongs to different user returns 403", async () => {
    mockSession.mockResolvedValue(VALID_SESSION as never);

    // DB returns a snapshot that belongs to "other-user", not "user-1"
    setupDb([
      makeChain({
        data: {
          id:           "snap-99",
          user_id:      "other-user",
          parsed_output: {},
          created_at:   new Date().toISOString(),
        },
        error: null,
      }),
    ]);

    const req = makeReq({ protocol_snapshot_id: "snap-99" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/forbidden/i);
  });
});
