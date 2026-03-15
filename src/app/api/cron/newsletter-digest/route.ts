import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.MAGIC_FROM_EMAIL || "newsletter@linapoint.com";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://linapoint.com";

function buildDigestHtml(posts: { title: string; excerpt: string; url: string }[], unsubUrl: string): string {
  const postRows = posts
    .map(
      (p) => `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #e5e7eb">
          <h3 style="margin:0 0 6px;color:#0d9488;font-size:18px">${p.title}</h3>
          <p style="margin:0 0 8px;color:#4b5563;font-size:14px;line-height:1.5">${p.excerpt}</p>
          <a href="${p.url}" style="color:#d97706;font-weight:600;text-decoration:none;font-size:13px">Read more &rarr;</a>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
  <div style="background:linear-gradient(135deg,#0d9488 0%,#0e7490 100%);color:white;padding:32px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="margin:0;font-size:24px">🌴 Island Digest</h1>
    <p style="margin:8px 0 0;opacity:0.9;font-size:13px">Your weekly dispatch from Lina Point &amp; the Overwater Ecosystem</p>
  </div>
  <div style="background:white;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
    <p style="color:#374151;font-size:15px;line-height:1.6">Here&rsquo;s what&rsquo;s new this week across the ecosystem:</p>
    <table style="width:100%;border-collapse:collapse">${postRows}</table>
    <div style="margin-top:24px;text-align:center">
      <a href="https://overwater.com?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest" style="display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:4px">Explore Overwater</a>
      <a href="https://magic.overwater.com?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest" style="display:inline-block;background:#7c3aed;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:4px">Cosmic Blueprint</a>
    </div>
    <p style="margin-top:32px;font-size:11px;color:#9ca3af;text-align:center">
      You&rsquo;re receiving this because you subscribed to our newsletter.<br/>
      Lina Point Resort &middot; San Pedro, Ambergris Caye, Belize<br/>
      <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>
    </p>
  </div>
</body></html>`;
}

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Fetch active subscribers with unsub tokens
  const { data: subscribers, error: subErr } = await supabase
    .from("newsletter_subscribers")
    .select("email, unsub_token")
    .eq("status", "active");

  if (subErr || !subscribers?.length) {
    return NextResponse.json({
      sent: 0,
      reason: subErr ? subErr.message : "No active subscribers",
    });
  }

  // Fetch recent blog posts (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("title, excerpt, slug")
    .gte("published_at", weekAgo)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5);

  // Build content list — always include ecosystem highlights even if no new posts
  const contentItems: { title: string; excerpt: string; url: string }[] = [];

  if (posts?.length) {
    for (const p of posts) {
      contentItems.push({
        title: p.title,
        excerpt: p.excerpt || "",
        url: `https://linapoint.com/blog/${p.slug}`,
      });
    }
  }

  // Always include ecosystem highlights
  contentItems.push(
    {
      title: "Discover Your Overwater Dream",
      excerpt:
        "Glass-floor cabanas starting from $458/mo with 0% interest. Own a piece of Belize.",
      url: "https://overwater.com?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest",
    },
    {
      title: "Today's Cosmic Energy",
      excerpt:
        "Check today's Tzolk'in day sign, spirit animal, and galactic tone — free daily cosmic weather.",
      url: "https://magic.overwater.com/today?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest",
    }
  );

  // Send individually so each subscriber gets a unique unsubscribe link
  let sent = 0;
  for (const sub of subscribers) {
    const unsubUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${sub.unsub_token}`;
    const html = buildDigestHtml(contentItems, unsubUrl);
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [sub.email],
          subject: "🌴 Your Weekly Island Digest",
          html,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });
      sent++;
    } catch (err) {
      console.error("[NewsletterDigest] Send failed for subscriber:", err);
    }
  }

  return NextResponse.json({ sent, total: subscribers.length });
}
