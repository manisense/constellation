// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type OutboxJob = {
  id: string;
  constellation_id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  event_type:
    | "message_new"
    | "call_ringing"
    | "ritual_reminder"
    | "partner_joined"
    | "system";
  payload: Record<string, unknown>;
  attempts: number;
  subscription_ids: string[];
};

type DispatchSummary = {
  claimed: number;
  sent: number;
  failed: number;
  discarded: number;
};

const getEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
};

const getOptionalNumberEnv = (key: string, fallback: number): number => {
  const value = Deno.env.get(key);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
};

const buildCopy = (job: OutboxJob) => {
  switch (job.event_type) {
    case "message_new":
      return {
        title: "New message from your partner",
        body:
          typeof job.payload?.preview_text === "string" &&
          job.payload.preview_text.trim().length > 0
            ? job.payload.preview_text.slice(0, 120)
            : "Open your shared chat to read it.",
      };
    case "call_ringing":
      return {
        title: "Incoming call",
        body:
          job.payload?.call_type === "video"
            ? "Your partner started a video call."
            : "Your partner started a voice call.",
      };
    case "ritual_reminder":
      return {
        title: "Daily ritual reminder",
        body: "Take a moment to complete today’s ritual together.",
      };
    case "partner_joined":
      return {
        title: "Your partner joined",
        body: "Your constellation is now complete.",
      };
    default:
      return {
        title: "OurSpace update",
        body: "There’s something new in your shared space.",
      };
  }
};

const sendOneSignalNotification = async (
  restApiKey: string,
  appId: string,
  job: OutboxJob
): Promise<{ ok: boolean; error?: string }> => {
  if (!job.subscription_ids || job.subscription_ids.length === 0) {
    return { ok: false, error: "no_active_subscription_ids" };
  }

  const copy = buildCopy(job);
  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${restApiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      include_subscription_ids: job.subscription_ids,
      headings: { en: copy.title },
      contents: { en: copy.body },
      data: {
        event_type: job.event_type,
        notification_outbox_id: job.id,
        constellation_id: job.constellation_id,
        actor_user_id: job.actor_user_id,
        ...(job.payload ?? {}),
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      ok: false,
      error: `onesignal_http_${response.status}:${errorBody.slice(0, 500)}`,
    };
  }

  return { ok: true };
};

serve(async (req) => {
  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    if (req.method === "GET") {
      const nowIso = new Date().toISOString();
      const pendingAgeWarnSeconds = getOptionalNumberEnv(
        "NOTIF_ALERT_PENDING_AGE_SECONDS",
        300
      );
      const failedWarnCount = getOptionalNumberEnv(
        "NOTIF_ALERT_FAILED_COUNT",
        20
      );
      const queuedWarnCount = getOptionalNumberEnv(
        "NOTIF_ALERT_QUEUED_COUNT",
        100
      );

      const [queued, processing, failed, sent, discarded] = await Promise.all([
        supabase
          .from("notification_outbox")
          .select("id", { count: "exact", head: true })
          .eq("status", "queued"),
        supabase
          .from("notification_outbox")
          .select("id", { count: "exact", head: true })
          .eq("status", "processing"),
        supabase
          .from("notification_outbox")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed"),
        supabase
          .from("notification_outbox")
          .select("id", { count: "exact", head: true })
          .eq("status", "sent"),
        supabase
          .from("notification_outbox")
          .select("id", { count: "exact", head: true })
          .eq("status", "discarded"),
      ]);

      const countErrors = [queued, processing, failed, sent, discarded]
        .map((r) => r.error)
        .filter(Boolean);

      if (countErrors.length > 0) {
        throw countErrors[0];
      }

      const { data: oldestPending, error: oldestPendingError } = await supabase
        .from("notification_outbox")
        .select("created_at")
        .in("status", ["queued", "failed", "processing"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (oldestPendingError) {
        throw oldestPendingError;
      }

      const oldestPendingAgeSeconds = oldestPending?.created_at
        ? Math.max(
            0,
            Math.floor(
              (new Date(nowIso).getTime() -
                new Date(oldestPending.created_at).getTime()) /
                1000
            )
          )
        : 0;

      const queueCounts = {
        queued: queued.count ?? 0,
        processing: processing.count ?? 0,
        failed: failed.count ?? 0,
        sent: sent.count ?? 0,
        discarded: discarded.count ?? 0,
      };

      const warnings: string[] = [];
      if (oldestPendingAgeSeconds > pendingAgeWarnSeconds) {
        warnings.push("pending_age_exceeds_threshold");
      }

      if (queueCounts.failed > failedWarnCount) {
        warnings.push("failed_count_exceeds_threshold");
      }

      if (queueCounts.queued > queuedWarnCount) {
        warnings.push("queued_count_exceeds_threshold");
      }

      const status = warnings.length > 0 ? "degraded" : "healthy";

      return new Response(
        JSON.stringify({
          success: true,
          health: {
            at: nowIso,
            status,
            queue: queueCounts,
            oldest_pending_age_seconds: oldestPendingAgeSeconds,
            thresholds: {
              pending_age_warn_seconds: pendingAgeWarnSeconds,
              failed_warn_count: failedWarnCount,
              queued_warn_count: queuedWarnCount,
            },
            alerts: warnings,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const oneSignalRestApiKey = getEnv("ONESIGNAL_REST_API_KEY");
    const oneSignalAppId =
      Deno.env.get("ONESIGNAL_APP_ID") ||
      getEnv("EXPO_PUBLIC_ONESIGNAL_APP_ID");

    const body = await req.json().catch(() => ({}));
    const requestedBatchSize = Number(body?.batch_size);
    const batchSize = Number.isFinite(requestedBatchSize)
      ? Math.max(1, Math.min(100, requestedBatchSize))
      : 20;

    const summary: DispatchSummary = {
      claimed: 0,
      sent: 0,
      failed: 0,
      discarded: 0,
    };

    const { data: jobs, error: claimError } = await supabase.rpc(
      "claim_notification_outbox",
      { p_batch_size: batchSize }
    );

    if (claimError) {
      throw claimError;
    }

    const outboxJobs = (jobs ?? []) as OutboxJob[];
    summary.claimed = outboxJobs.length;

    for (const job of outboxJobs) {
      if (!job.subscription_ids || job.subscription_ids.length === 0) {
        const { error: completeError } = await supabase.rpc(
          "complete_notification_outbox",
          {
            p_id: job.id,
            p_success: false,
            p_error: "no_active_subscription_ids",
            p_retry_delay_seconds: 0,
            p_discard: true,
          }
        );

        if (completeError) {
          throw completeError;
        }

        summary.discarded += 1;
        continue;
      }

      const delivery = await sendOneSignalNotification(
        oneSignalRestApiKey,
        oneSignalAppId,
        job
      );

      if (delivery.ok) {
        const { error: completeError } = await supabase.rpc(
          "complete_notification_outbox",
          {
            p_id: job.id,
            p_success: true,
            p_error: null,
            p_retry_delay_seconds: 0,
            p_discard: false,
          }
        );

        if (completeError) {
          throw completeError;
        }

        summary.sent += 1;
        continue;
      }

      const { error: completeError } = await supabase.rpc(
        "complete_notification_outbox",
        {
          p_id: job.id,
          p_success: false,
          p_error: delivery.error ?? "delivery_failed",
          p_retry_delay_seconds: 60,
          p_discard: false,
        }
      );

      if (completeError) {
        throw completeError;
      }

      summary.failed += 1;
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notification-dispatcher error", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
