"use client";

import { useAuth } from "@/hooks/useAuth";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { useEffect, useState } from "react";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

const CATEGORIES = [
  "travel",
  "diving",
  "fishing",
  "culture",
  "food",
  "tips",
  "news",
];

export default function AdminBlogPage() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchPosts = async () => {
    const supabase = createBrowserSupabaseClient();
    const { data } = await supabase
      .from("blog_posts")
      .select(
        "id, slug, title, author, category, published, published_at, created_at",
      )
      .order("created_at", { ascending: false });
    setPosts(data || []);
    setFetching(false);
  };

  useEffect(() => {
    if (!user) {
      setFetching(false);
      return;
    }
    fetchPosts();
  }, [user]);

  const togglePublish = async (id: string, current: boolean) => {
    const supabase = createBrowserSupabaseClient();
    await supabase
      .from("blog_posts")
      .update({
        published: !current,
        published_at: !current ? new Date().toISOString() : null,
      })
      .eq("id", id);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              published: !current,
              published_at: !current ? new Date().toISOString() : null,
            }
          : p,
      ),
    );
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this blog post permanently?")) return;
    const supabase = createBrowserSupabaseClient();
    await supabase.from("blog_posts").delete().eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setCreateError("");
    const form = new FormData(e.currentTarget);
    const body = {
      title: form.get("title") as string,
      slug: form.get("slug") as string,
      content: form.get("content") as string,
      excerpt: form.get("excerpt") as string,
      category: form.get("category") as string,
      author: form.get("author") as string,
    };

    const res = await fetch("/api/admin/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setCreateError(json.error || "Failed to create post");
      return;
    }
    setPosts((prev) => [json.post, ...prev]);
    setShowCreate(false);
    (e.target as HTMLFormElement).reset();
  };

  if (loading || fetching) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-sky-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">
          Please sign in to access blog management.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {posts.length} posts · {posts.filter((p) => p.published).length}{" "}
            published
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setCreateError("");
          }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
        >
          + New Post
        </button>
      </header>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Author
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No blog posts yet. Create one manually or let the marketing
                  agent generate them.
                </td>
              </tr>
            )}
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3">
                  <a
                    href={`/blog/${post.slug}`}
                    className="text-sky-600 hover:underline font-medium text-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {post.title}
                  </a>
                  <p className="text-xs text-gray-400">/blog/{post.slug}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {post.author}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${
                      post.published
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {post.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(post.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => togglePublish(post.id, post.published)}
                    className="text-xs px-3 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100"
                  >
                    {post.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="text-xs px-3 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Post Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">New Blog Post</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleCreate}
              className="p-5 grid gap-4 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Title *
                </label>
                <input
                  name="title"
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Discover Overwater Paradise in Belize"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Slug * (URL-safe)
                </label>
                <input
                  name="slug"
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="overwater-paradise-belize"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Author
                </label>
                <input
                  name="author"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  defaultValue="Lina Point Team"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Excerpt
                </label>
                <input
                  name="excerpt"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Short summary for SEO and cards"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Content * (Markdown supported)
                </label>
                <textarea
                  name="content"
                  required
                  rows={10}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="# Heading&#10;&#10;Your post content here..."
                />
              </div>
              {createError && (
                <div className="sm:col-span-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {createError}
                </div>
              )}
              <div className="sm:col-span-2 flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {saving ? "Creating…" : "Create Post"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
