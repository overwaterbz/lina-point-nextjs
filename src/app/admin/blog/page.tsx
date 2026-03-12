'use client';

import { useAuth } from '@/hooks/useAuth';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import Link from 'next/link';

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

export default function AdminBlogPage() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchPosts = async () => {
    const supabase = createBrowserSupabaseClient();
    const { data } = await supabase
      .from('blog_posts')
      .select('id, slug, title, author, category, published, published_at, created_at')
      .order('created_at', { ascending: false });
    setPosts(data || []);
    setFetching(false);
  };

  useEffect(() => {
    if (!user) { setFetching(false); return; }
    fetchPosts();
  }, [user]);

  const togglePublish = async (id: string, current: boolean) => {
    const supabase = createBrowserSupabaseClient();
    await supabase
      .from('blog_posts')
      .update({
        published: !current,
        published_at: !current ? new Date().toISOString() : null,
      })
      .eq('id', id);
    setPosts(prev =>
      prev.map(p => p.id === id ? { ...p, published: !current, published_at: !current ? new Date().toISOString() : null } : p)
    );
  };

  const deletePost = async (id: string) => {
    if (!confirm('Delete this blog post permanently?')) return;
    const supabase = createBrowserSupabaseClient();
    await supabase.from('blog_posts').delete().eq('id', id);
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-sky-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Please sign in to access blog management.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Blog Management</h1>
          <Link href="/admin/dashboard" className="text-sky-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {posts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No blog posts yet. The marketing agent will create them automatically.
                  </td>
                </tr>
              )}
              {posts.map(post => (
                <tr key={post.id}>
                  <td className="px-4 py-3">
                    <Link href={`/blog/${post.slug}`} className="text-sky-600 hover:underline font-medium" target="_blank">
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{post.author}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${
                      post.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {post.published ? 'Published' : 'Draft'}
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
                      {post.published ? 'Unpublish' : 'Publish'}
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

        <p className="mt-4 text-sm text-gray-500">
          {posts.length} post{posts.length !== 1 ? 's' : ''} total &middot; {posts.filter(p => p.published).length} published
        </p>
      </div>
    </div>
  );
}
