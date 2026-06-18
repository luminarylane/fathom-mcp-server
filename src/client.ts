/**
 * Thin Fathom API client — fetch-based, no SDK needed.
 *
 * API: https://api.fathom.ai/external/v1
 * Auth: X-Api-Key header
 * Rate limit: 60 requests/60s per user
 */

import { waitForRateLimit, withRetry } from "./rate-limiter.js";

const BASE_URL = "https://api.fathom.ai/external/v1";

export interface FathomCalendarInvitee {
  name: string;
  email: string;
  email_domain: string;
  is_external: boolean;
  matched_speaker_display_name: string | null;
}

export interface FathomMeeting {
  title: string;
  meeting_title: string;
  url: string;
  created_at: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  recording_id: number;
  recording_start_time: string;
  recording_end_time: string;
  transcript_language: string;
  default_summary: string | null;
  action_items: FathomActionItem[] | null;
  calendar_invitees: FathomCalendarInvitee[];
  recorded_by: {
    name: string;
    email: string;
    email_domain: string;
    team: string | null;
  };
  share_url: string;
}

export interface FathomActionItem {
  text: string;
  assignee?: string;
  due_date?: string;
  completed: boolean;
}

export interface FathomSummary {
  template_name: string;
  markdown_formatted: string;
}

export interface FathomTranscriptEntry {
  speaker: {
    display_name: string;
    matched_calendar_invitee_email: string | null;
  };
  text: string;
  timestamp: string;
}

export class FathomClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("FATHOM_API_KEY is required");
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      }
    }

    // Check client-side rate limit before making API call
    const limit = await waitForRateLimit();
    if (!limit.allowed) {
      const retrySec = Math.ceil(limit.retryAfterMs / 1000);
      throw new Error(
        `Fathom API rate limit reached. Wait ${retrySec}s then retry.`,
      );
    }

    return withRetry(async () => {
      const res = await fetch(url.toString(), {
        headers: {
          "X-Api-Key": this.apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Fathom API ${res.status}: ${body || res.statusText}`);
      }

      return res.json() as Promise<T>;
    });
  }

  async listMeetings(
    options: {
      limit?: number;
      cursor?: string;
      after?: string;
      before?: string;
    } = {},
  ): Promise<{ items: FathomMeeting[]; next_cursor: string }> {
    const params: Record<string, string> = {};
    if (options.limit) params.limit = String(options.limit);
    if (options.cursor) params.cursor = options.cursor;
    if (options.after) params.after = options.after;
    if (options.before) params.before = options.before;

    return this.request("/meetings", params);
  }

  async getSummary(recordingId: string): Promise<{ summary: FathomSummary }> {
    return this.request(
      `/recordings/${encodeURIComponent(recordingId)}/summary`,
    );
  }

  async getTranscript(
    recordingId: string,
  ): Promise<{ transcript: FathomTranscriptEntry[] }> {
    return this.request(
      `/recordings/${encodeURIComponent(recordingId)}/transcript`,
    );
  }
}
