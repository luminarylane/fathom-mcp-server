#!/usr/bin/env node
/**
 * Standalone Fathom MCP Server — Meeting Intelligence
 *
 * Provides SENSE tools for extracting meeting intelligence from Fathom.
 * Auth: FATHOM_API_KEY env var (X-Api-Key header).
 *
 * Usage:
 *   FATHOM_API_KEY=xxx npx fathom-mcp-server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { FathomClient } from "./client.js";
import { textResult, errorResult, senseResult } from "./response.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const FATHOM_API_KEY = process.env.FATHOM_API_KEY;
if (!FATHOM_API_KEY) {
  console.error("FATHOM_API_KEY env var is required");
  process.exit(1);
}

const client = new FathomClient(FATHOM_API_KEY);

/**
 * Wrap a tool handler with try/catch so unhandled API errors
 * return structured errorResult instead of crashing the server.
 */
function safeHandler<T>(
  toolName: string,
  handler: (
    args: T,
  ) => Promise<ReturnType<typeof textResult | typeof senseResult>>,
): (
  args: T,
) => Promise<
  ReturnType<typeof textResult | typeof senseResult | typeof errorResult>
> {
  return async (args: T) => {
    try {
      return await handler(args);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[${toolName}] Error: ${msg}`);

      const statusMatch = msg.match(/Fathom API (\d+)/);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined;

      let action: string | undefined;
      if (statusCode === 401) {
        action =
          "AUTH_FAILED: FATHOM_API_KEY is invalid or expired. Check your Fathom settings.";
      } else if (statusCode === 429) {
        action =
          "RATE_LIMITED: Fathom rate limit (60/min). Wait 60s and retry.";
      } else if (statusCode && statusCode >= 500) {
        action =
          "SERVER_ERROR: Fathom is having issues. Wait 30s and retry once.";
      }

      return errorResult("API error", `${toolName} failed: ${msg}`, {
        ...(statusCode !== undefined && { statusCode }),
        ...(action && { action }),
      });
    }
  };
}

// --- Server Setup ---

const server = new McpServer({
  name: "fathom-mcp-server",
  version,
});

// =====================
// SENSE Tools (read)
// =====================

server.registerTool(
  "fathom_list_meetings",
  {
    description:
      "List recent meetings from Fathom with optional date filters. " +
      "Returns title, date, participants, summary, and action items.",
    inputSchema: {
      limit: z
        .number()
        .optional()
        .describe("Number of meetings to return (default: 10, max: 50)"),
      cursor: z.string().optional().describe("Pagination cursor for next page"),
      after: z
        .string()
        .optional()
        .describe("Only meetings after this ISO 8601 date (e.g., 2026-03-12)"),
      before: z
        .string()
        .optional()
        .describe("Only meetings before this ISO 8601 date"),
    },
  },
  safeHandler("fathom_list_meetings", async (args) => {
    const result = await client.listMeetings({
      limit: Math.min(args.limit || 10, 50),
      cursor: args.cursor,
      after: args.after,
      before: args.before,
    });

    if (!Array.isArray(result?.items)) {
      return errorResult(
        "Unexpected response",
        "Fathom API returned an unexpected shape — the API may have changed.",
      );
    }

    const meetings = result.items.map((m) => ({
      recording_id: String(m.recording_id),
      title: m.title,
      scheduled_start_time: m.scheduled_start_time,
      recording_start_time: m.recording_start_time,
      recording_end_time: m.recording_end_time,
      participants: m.calendar_invitees.map((i) => i.name),
      recorded_by: m.recorded_by.name,
      url: m.url,
      share_url: m.share_url,
      ...(m.default_summary && { summary: m.default_summary }),
      ...(m.action_items?.length && { action_items: m.action_items }),
    }));

    return senseResult(
      {
        meetings,
        next_cursor: result.next_cursor || undefined,
        count: meetings.length,
      },
      "Fathom",
    );
  }),
);

server.registerTool(
  "fathom_get_summary",
  {
    description:
      "Get the AI-generated summary for a specific meeting. Returns markdown-formatted summary.",
    inputSchema: {
      recording_id: z
        .string()
        .describe("The meeting/recording ID from fathom_list_meetings"),
    },
  },
  safeHandler("fathom_get_summary", async (args) => {
    if (!args.recording_id.trim()) {
      return errorResult("Invalid input", "recording_id cannot be empty");
    }
    const result = await client.getSummary(args.recording_id);
    return senseResult(
      {
        recording_id: args.recording_id,
        template: result.summary?.template_name,
        summary: result.summary?.markdown_formatted ?? null,
      },
      "Fathom",
    );
  }),
);

server.registerTool(
  "fathom_get_transcript",
  {
    description:
      "Get the full speaker-labeled, timestamped transcript for a specific meeting. " +
      "Use sparingly — transcripts can be large. Prefer fathom_list_meetings for quick overviews.",
    inputSchema: {
      recording_id: z
        .string()
        .describe("The meeting/recording ID from fathom_list_meetings"),
    },
  },
  safeHandler("fathom_get_transcript", async (args) => {
    if (!args.recording_id.trim()) {
      return errorResult("Invalid input", "recording_id cannot be empty");
    }
    const result = await client.getTranscript(args.recording_id);

    if (!Array.isArray(result?.transcript)) {
      return errorResult(
        "Unexpected response",
        "Fathom API returned an unexpected transcript shape — the API may have changed.",
      );
    }

    const entries = result.transcript.map((e) => ({
      speaker: e.speaker.display_name,
      speaker_email: e.speaker.matched_calendar_invitee_email,
      text: e.text,
      timestamp: e.timestamp,
    }));

    return senseResult(
      {
        recording_id: args.recording_id,
        entries,
        count: entries.length,
      },
      "Fathom",
    );
  }),
);

server.registerTool(
  "fathom_search_meetings",
  {
    description:
      "Search the most recent 50 meetings by keyword in title. Client-side filtering " +
      "since Fathom API doesn't have native search. Use the 'after' param to narrow the window.",
    inputSchema: {
      query: z
        .string()
        .describe("Search keyword to match against meeting titles"),
      limit: z
        .number()
        .optional()
        .describe("Max results to return (default: 10)"),
      after: z
        .string()
        .optional()
        .describe("Only meetings after this ISO 8601 date"),
    },
  },
  safeHandler("fathom_search_meetings", async (args) => {
    if (!args.query.trim()) {
      return errorResult("Invalid input", "Query cannot be empty");
    }

    const queryLower = args.query.toLowerCase();
    const maxResults = args.limit || 10;

    // Fetch a larger batch to filter client-side
    const result = await client.listMeetings({
      limit: 50,
      after: args.after,
    });

    if (!Array.isArray(result?.items)) {
      return errorResult(
        "Unexpected response",
        "Fathom API returned an unexpected shape.",
      );
    }

    const matched = result.items
      .filter((m) => m.title.toLowerCase().includes(queryLower))
      .slice(0, maxResults)
      .map((m) => ({
        recording_id: String(m.recording_id),
        title: m.title,
        scheduled_start_time: m.scheduled_start_time,
        participants: m.calendar_invitees.map((i) => i.name),
        url: m.url,
        ...(m.default_summary && { summary: m.default_summary }),
        ...(m.action_items?.length && { action_items: m.action_items }),
      }));

    return senseResult(
      {
        meetings: matched,
        count: matched.length,
        query: args.query,
        total_scanned: result.items.length,
      },
      "Fathom",
    );
  }),
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Fathom MCP Server running on stdio");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
