import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabaseClient } from "../utils/fake-supabase-client";

const supabaseFactory = vi.hoisted(() => ({
  createClient: () => {
    const client = globalThis.__fakeSupabase;
    if (!client) {
      throw new Error("Fake Supabase client is not initialized");
    }
    return client;
  },
}));

vi.mock("@/lib/supabase/server", () => supabaseFactory);
vi.mock("@/lib/supabase/admin", () => supabaseFactory);

import { generateContentTypesSummary } from "@/app/actions/brand-kit/generate-content-types-summary";
import { generateVisualStyleSummary } from "@/app/actions/brand-kit/generate-visual-style-summary";
import { generateTypographySummary } from "@/app/actions/brand-kit/generate-typography-summary";
import { generateWritingStyleSummary } from "@/app/actions/brand-kit/generate-writing-style-summary";
import { checkFinalReportPrereqs } from "@/lib/brand-report/preflight";
import { generateFinalReport } from "@/app/actions/brand-kit/generate-final-report";

const processAIRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/ai/route", () => ({
  processAIRequest: (...args: unknown[]) => processAIRequestMock(...args),
}));

vi.mock("@/app/actions/brand-kit/backfill-metrics", () => ({
  backfillMetricsForSection: vi.fn(async () => ({
    success: false,
    inserted: 0,
  })),
}));

describe("brand identity end-to-end integration", () => {
  let supabase: FakeSupabaseClient;

  beforeEach(() => {
    supabase = new FakeSupabaseClient();
    globalThis.__fakeSupabase = supabase;

    supabase.setCurrentUser({ id: "auth-user-1", email: "alpha@example.com" });
    supabase.from("users").insert({
      id: "internal-user-1",
      auth_user_id: "auth-user-1",
      email_hash: "auth-user-1",
      name: "Alpha",
    });

    supabase.from("company_setup").insert({
      id: "company-1",
      user_id: "internal-user-1",
      auth_user_id: "auth-user-1",
      brand_name: "Alpha Labs",
      updated_at: new Date().toISOString(),
    });

    supabase.from("brand_content_types").insert([
      {
        user_id: "auth-user-1",
        name: "Founder letters",
        description: "Signals conviction to community investors.",
        ranking: "very important",
        brand_name: "Alpha Labs",
      },
      {
        user_id: "auth-user-1",
        name: "Deep-dive case studies",
        description: "Proves the operating system delivers measurable ROI.",
        ranking: "important",
        brand_name: "Alpha Labs",
      },
      {
        user_id: "auth-user-1",
        name: "Product livestreams",
        description: "Celebrates releases with the customer advisory board.",
        ranking: "not important",
        brand_name: "Alpha Labs",
      },
    ]);

    supabase.from("brand_visual_style").insert([
      {
        user_id: "auth-user-1",
        name: "Minimal dashboards",
        description: "Lots of whitespace with confident typography.",
        ranking: "very important",
        brand_name: "Alpha Labs",
        category: "Product UI",
      },
      {
        user_id: "auth-user-1",
        name: "Bold accent gradients",
        description: "Injects momentum into call-to-action moments.",
        ranking: "important",
        brand_name: "Alpha Labs",
        category: "Product UI",
      },
    ]);

    supabase.from("brand_typography").insert([
      {
        user_id: "auth-user-1",
        name: "Instrument Sans",
        title: "Headings",
        description: "Confident uppercase display for hero statements.",
        ranking: "very important",
        brand_name: "Alpha Labs",
        category: "Headings",
        typography_css: "h1 { font-family: 'Instrument Sans'; }",
      },
      {
        user_id: "auth-user-1",
        name: "Inter",
        title: "Body",
        description: "Readable at every breakpoint with generous spacing.",
        ranking: "important",
        brand_name: "Alpha Labs",
        category: "Body",
        typography_css: "body { font-family: 'Inter'; }",
      },
    ]);

    supabase.from("brand_writing_style").insert([
      {
        user_id: "auth-user-1",
        name: "Explanatory (or Expository)",
        title: "Teacherly",
        description: "Explains complex workflows step-by-step.",
        ranking: "very important",
        brand_name: "Alpha Labs",
        category: "Voice",
      },
      {
        user_id: "auth-user-1",
        name: "Benefit-Oriented",
        title: "Outcome-first",
        description: "Connects each product module to a tangible metric.",
        ranking: "important",
        brand_name: "Alpha Labs",
        category: "Voice",
      },
    ]);

    supabase.from("brand_color_themes").insert([
      {
        user_id: "internal-user-1",
        css_variables: ":root { --brand-primary: #4f46e5; }",
        css: ":root { --brand-primary: #4f46e5; }",
      },
    ]);

    supabase.from("brand_typography").insert([
      {
        user_id: "internal-user-1",
        typography_css: "body { font-family: 'Inter'; }",
        css: "body { font-family: 'Inter'; }",
      },
    ]);

    supabase.from("brand_summaries").insert({
      user_id: "internal-user-1",
      attribute_summary: "Attributes established.",
      tone_summary: "Tone established.",
      values_summary: "Values established.",
      brand_name: "Alpha Labs",
    });

    processAIRequestMock.mockResolvedValue({
      content: undefined,
      response: undefined,
    });
  });

  afterEach(() => {
    globalThis.__fakeSupabase = undefined;
  });

  it("runs interview to report flow with consistent user identifiers", async () => {
    const contentSummary = await generateContentTypesSummary();
    const visualSummary = await generateVisualStyleSummary();
    const typographySummary = await generateTypographySummary();
    const writingSummary = await generateWritingStyleSummary();

    expect(contentSummary.success).toBe(true);
    expect(visualSummary.success).toBe(true);
    expect(typographySummary.success).toBe(true);
    expect(writingSummary.success).toBe(true);

    expect(contentSummary.authUserId).toBe("auth-user-1");
    expect(visualSummary.authUserId).toBe("auth-user-1");
    expect(typographySummary.authUserId).toBe("auth-user-1");
    expect(writingSummary.tierUsed).toBeDefined();

    const summariesTable = supabase.getTable("brand_summaries");
    const persisted = summariesTable.find((row) => row.user_id === "internal-user-1");
    expect(persisted).toBeDefined();
    expect(persisted?.visual_style_summary).toContain("Minimal dashboards");

    const preflight = await checkFinalReportPrereqs("auth-user-1");
    expect(preflight.ok).toBe(true);

    const finalReport = await generateFinalReport();
    expect(finalReport.success).toBe(true);
    expect(finalReport.reportId).toBeDefined();
    expect(finalReport.markdown).toContain("Alpha Labs");

    const reportsTable = supabase.getTable("brand_reports");
    expect(reportsTable).toHaveLength(1);
    expect(reportsTable[0].user_id).toBe("internal-user-1");
  });

  it("isolates summaries across multiple users", async () => {
    const alphaSummary = await generateContentTypesSummary();
    expect(alphaSummary.success).toBe(true);

    supabase.from("users").insert({
      id: "internal-user-2",
      auth_user_id: "auth-user-2",
      email_hash: "auth-user-2",
      name: "Beta",
    });

    supabase.from("brand_content_types").insert({
      user_id: "auth-user-2",
      name: "Beta playbook",
      description: "Runs customer onboarding live streams.",
      ranking: "very important",
      brand_name: "Beta Studio",
    });

    supabase.setCurrentUser({ id: "auth-user-2", email: "beta@example.com" });

    const betaSummary = await generateContentTypesSummary();
    expect(betaSummary.success).toBe(true);
    expect(alphaSummary.summary).toContain("Founder letters");
    expect(betaSummary.summary).toContain("Beta playbook");

    const summariesTable = supabase.getTable("brand_summaries");
    const alphaRows = summariesTable.filter((row) => row.user_id === "internal-user-1");
    const betaRows = summariesTable.filter((row) => row.user_id === "internal-user-2");

    expect(alphaRows).toHaveLength(1);
    expect(betaRows).toHaveLength(1);
    expect(alphaRows[0].brand_name).toBe("Alpha Labs");
    expect(betaRows[0].brand_name).toBe("Beta Studio");
  });

  it("returns gating errors when distributions are invalid", async () => {
    supabase.setCurrentUser({ id: "auth-user-1", email: "alpha@example.com" });
    await supabase.from("brand_content_types").delete().eq("user_id", "auth-user-1");

    supabase.from("brand_content_types").insert([
      {
        user_id: "auth-user-1",
        name: "Investor updates",
        ranking: "very important",
        description: "Keeps the board in sync every month.",
        brand_name: "Alpha Labs",
      },
      {
        user_id: "auth-user-1",
        name: "Product updates",
        ranking: "very important",
        description: "Signals velocity to customers.",
        brand_name: "Alpha Labs",
      },
      {
        user_id: "auth-user-1",
        name: "Partner spotlights",
        ranking: "very important",
        description: "Highlights integrations.",
        brand_name: "Alpha Labs",
      },
    ]);

    const result = await generateContentTypesSummary();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Distribution invalid");
    expect(result.issues).toContain("Very important items cannot exceed 40% of the total.");
  });
});
