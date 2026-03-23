"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface ReviewRow {
  id: string;
  platform: string;
  reviewer_name: string | null;
  rating: number;
  review_text: string | null;
  review_date: string;
  sentiment: string | null;
  escalated: boolean;
  response_drafted: boolean;
  response_sent: boolean;
  response_text: string | null;
}

const PLATFORM_ICONS: Record<string, string> = {
  google: "G",
  tripadvisor: "TA",
  booking: "B",
  expedia: "E",
  airbnb: "AB",
  facebook: "FB",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "text-emerald-700 bg-emerald-50",
  neutral: "text-amber-700 bg-amber-50",
  negative: "text-red-700 bg-red-50",
};

export default function ReputationPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [runMsg, setRunMsg] = useState("");
  const [running, setRunning] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  function loadReviews() {
    const supabase = createBrowserSupabaseClient();
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("review_monitoring")
          .select(
            "id, platform, reviewer_name, rating, review_text, review_date, sentiment, escalated, response_drafted, response_sent, response_text",
          )
          .order("review_date", { ascending: false })
          .limit(100);
        setReviews((data ?? []) as ReviewRow[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function handleRunCron() {
    setRunning(true);
    setRunMsg("");
    try {
      const res = await fetch(`/api/cron/reputation-monitor`, {
        headers: {
          authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`,
        },
      });
      const json = await res.json();
      setRunMsg(
        res.ok
          ? `Done — ${json.responseDrafted ?? 0} responses drafted, ${json.escalated ?? 0} escalated`
          : `Error: ${json.error ?? "unknown"}`,
      );
      loadReviews();
    } catch (e) {
      setRunMsg(String(e));
    } finally {
      setRunning(false);
    }
  }

  async function markResponseSent(reviewId: string) {
    setMarkingId(reviewId);
    const supabase = createBrowserSupabaseClient();
    try {
      await supabase
        .from("review_monitoring")
        .update({ response_sent: true, responded_at: new Date().toISOString() })
        .eq("id", reviewId);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, response_sent: true } : r,
        ),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingId(null);
    }
  }

  const overallScore =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const pending = reviews.filter((r) => r.response_drafted && !r.response_sent);
  const escalated = reviews.filter((r) => r.escalated && !r.response_sent);
  const responseRate =
    reviews.length > 0
      ? Math.round(
          (reviews.filter((r) => r.response_sent).length / reviews.length) *
            100,
        )
      : 0;

  const platformSummary = reviews.reduce<
    Record<string, { count: number; total: number }>
  >((acc, r) => {
    if (!acc[r.platform]) acc[r.platform] = { count: 0, total: 0 };
    acc[r.platform].count += 1;
    acc[r.platform].total += r.rating;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reputation Monitor
          </h1>
          <p className="text-sm text-gray-500">
            AI-drafted review responses · multi-platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          {runMsg && (
            <span className="text-sm text-teal-700 bg-teal-50 rounded px-3 py-1">
              {runMsg}
            </span>
          )}
          <button
            onClick={handleRunCron}
            disabled={running}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {running ? "Scanning…" : "Run Reputation Scan"}
          </button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard
          label="Overall Score"
          value={overallScore ?? "—"}
          stars={overallScore ? parseFloat(overallScore) : null}
        />
        <ScoreCard label="Response Rate" value={`${responseRate}%`} />
        <ScoreCard
          label="Pending Responses"
          value={String(pending.length)}
          alert={pending.length > 0}
        />
        <ScoreCard
          label="Escalated"
          value={String(escalated.length)}
          alert={escalated.length > 0}
        />
      </div>

      {/* Platform breakdown */}
      {Object.keys(platformSummary).length > 0 && (
        <section className="rounded-xl bg-white shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Platform Summary
          </h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(platformSummary).map(
              ([platform, { count, total }]) => (
                <div
                  key={platform}
                  className="flex items-center gap-2 rounded-lg border px-4 py-2"
                >
                  <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                    {PLATFORM_ICONS[platform] ??
                      platform.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 capitalize">
                      {platform}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {(total / count).toFixed(1)} ★ · {count} reviews
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      {/* Escalated reviews */}
      {escalated.length > 0 && (
        <section className="rounded-xl bg-red-50 border border-red-100 p-6">
          <h2 className="text-base font-semibold text-red-900 mb-4">
            🚨 Escalated Reviews ({escalated.length})
          </h2>
          <div className="space-y-4">
            {escalated.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                onMarkSent={() => markResponseSent(r.id)}
                marking={markingId === r.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pending responses */}
      {pending.length > 0 && (
        <section className="rounded-xl bg-white shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Responses ({pending.length})
          </h2>
          <div className="space-y-4">
            {pending.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                onMarkSent={() => markResponseSent(r.id)}
                marking={markingId === r.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* All reviews */}
      <section className="rounded-xl bg-white shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          All Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">
            No reviews yet. Add rows to the{" "}
            <code className="text-xs">review_monitoring</code> table.
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                onMarkSent={() => markResponseSent(r.id)}
                marking={markingId === r.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  stars,
  alert,
}: {
  label: string;
  value: string;
  stars?: number | null;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-5 shadow-sm ${alert ? "bg-red-50" : "bg-white border"}`}
    >
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${alert ? "text-red-700" : "text-gray-900"}`}
      >
        {value}
      </p>
      {stars != null && (
        <p className="text-xs text-amber-500 mt-0.5">
          {"★".repeat(Math.round(stars))}
          {"☆".repeat(5 - Math.round(stars))}
        </p>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  onMarkSent,
  marking,
}: {
  review: ReviewRow;
  onMarkSent: () => void;
  marking: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
            {PLATFORM_ICONS[review.platform] ??
              review.platform.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-sm font-medium text-gray-900">
              {review.reviewer_name ?? "Anonymous"} ·{" "}
              <span className="text-amber-500">
                {"★".repeat(review.rating)}
              </span>
              <span className="text-gray-300">
                {"★".repeat(5 - review.rating)}
              </span>
            </span>
            <p className="text-xs text-gray-400">{review.review_date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {review.sentiment && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${SENTIMENT_COLORS[review.sentiment] ?? ""}`}
            >
              {review.sentiment}
            </span>
          )}
          {review.escalated && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
              escalated
            </span>
          )}
          {review.response_sent && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
              responded
            </span>
          )}
        </div>
      </div>

      {review.review_text && (
        <p className="text-sm text-gray-600 line-clamp-2">
          {review.review_text}
        </p>
      )}

      {review.response_drafted && review.response_text && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-teal-600 hover:underline"
          >
            {expanded ? "Hide" : "View"} AI-drafted response
          </button>
          {expanded && (
            <div className="mt-2 rounded bg-teal-50 p-3 text-sm text-teal-800">
              {review.response_text}
            </div>
          )}
          {!review.response_sent && (
            <button
              onClick={onMarkSent}
              disabled={marking}
              className="mt-2 ml-2 text-xs text-white bg-teal-600 hover:bg-teal-700 rounded px-3 py-1 disabled:opacity-50 transition"
            >
              {marking ? "Marking…" : "Mark as Sent"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
