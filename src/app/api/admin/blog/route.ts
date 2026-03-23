export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // "published" | "draft" | undefined

  const supabase = getService();
  let query = supabase
    .from("blog_posts")
    .select(
      "id, slug, title, author, category, published, published_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (status === "published") query = query.eq("published", true);
  else if (status === "draft") query = query.eq("published", false);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, slug, content, excerpt, category, author, tags } = body;

  if (!title?.trim() || !slug?.trim() || !content?.trim()) {
    return NextResponse.json(
      { error: "title, slug, and content are required" },
      { status: 400 },
    );
  }

  // Basic slug sanitization — lowercase, alphanumeric + hyphens only
  const safeSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  const supabase = getService();
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title: title.trim(),
      slug: safeSlug,
      content: content.trim(),
      excerpt: excerpt?.trim() || null,
      category: category || "travel",
      author: author?.trim() || "Lina Point Team",
      tags: Array.isArray(tags) ? tags : [],
    })
    .select(
      "id, slug, title, author, category, published, published_at, created_at",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Slug already exists — choose a different one" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data }, { status: 201 });
}
