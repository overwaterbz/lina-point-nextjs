import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import Navbar from '@/components/resort/Navbar';
import Footer from '@/components/resort/Footer';
import { createServerSupabaseClient } from '@/../lib/supabase-server';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  author: string;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string;
}

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, meta_title, meta_description, cover_image')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (!post) return { title: 'Post Not Found' };

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || undefined,
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || undefined,
      ...(post.cover_image ? { images: [post.cover_image] } : {}),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (!post) notFound();

  const blogPost = post as BlogPost;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blogPost.title,
    description: blogPost.excerpt || undefined,
    image: blogPost.cover_image || undefined,
    datePublished: blogPost.published_at,
    author: { "@type": "Person", name: blogPost.author },
    publisher: {
      "@type": "Organization",
      name: "Lina Point Belize Overwater Resort",
      url: "https://lina-point.vercel.app",
    },
    mainEntityOfPage: `https://lina-point.vercel.app/blog/${blogPost.slug}`,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://lina-point.vercel.app" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://lina-point.vercel.app/blog" },
      { "@type": "ListItem", position: 3, name: blogPost.title, item: `https://lina-point.vercel.app/blog/${blogPost.slug}` },
    ],
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Navbar />

      {/* Cover Image */}
      {blogPost.cover_image && (
        <section className="relative h-[50vh] min-h-[300px] overflow-hidden">
          <Image
            src={blogPost.cover_image}
            alt={blogPost.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
        </section>
      )}

      {/* Article */}
      <article className="max-w-3xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <Link href="/" className="hover:text-sky-600 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-sky-600 transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-gray-600 truncate">{blogPost.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <span className="text-[10px] tracking-[0.3em] uppercase text-sky-600 font-medium">
            {blogPost.category.replace('-', ' ')}
          </span>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-gray-900 mt-3 mb-4 leading-tight">
            {blogPost.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>By {blogPost.author}</span>
            <span>•</span>
            <time dateTime={blogPost.published_at}>
              {new Date(blogPost.published_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
          </div>
        </header>

        {/* Content — rendered as markdown-like HTML */}
        <div
          className="prose prose-lg prose-gray max-w-none prose-headings:font-display prose-a:text-sky-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(blogPost.content),
          }}
        />

        {/* Tags */}
        {blogPost.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              {blogPost.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Back to Blog */}
        <div className="mt-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sky-600 text-sm hover:text-sky-700 transition-colors"
          >
            ← Back to all posts
          </Link>
        </div>
      </article>

      {/* CTA */}
      <section className="bg-sky-700 py-16 text-center text-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-bold mb-4">
            Book Your Belize Escape
          </h2>
          <p className="text-white/70 mb-8">
            Direct bookings save at least 6% compared to any OTA. Use code
            DIRECT10 for 10% off.
          </p>
          <Link
            href="/booking"
            className="inline-block bg-white text-sky-700 px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold hover:bg-white/90 transition"
          >
            Book Direct & Save
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

/**
 * Simple markdown-to-HTML renderer for blog content.
 * Handles headings, bold, italic, links, lists, tables, images, and paragraphs.
 */
function renderMarkdown(md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let html = escaped
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr />')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Tables (simple)
    .replace(/^\|(.+)\|$/gm, (_, row: string) => {
      const cells = row.split('|').map((c: string) => c.trim()).filter(Boolean);
      if (cells.every((c: string) => /^[-:]+$/.test(c))) return '';
      const tag = 'td';
      return `<tr>${cells.map((c: string) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
    });

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Wrap consecutive <tr> in <table>
  html = html.replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>');

  // Paragraphs: wrap remaining text lines
  html = html
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<[a-z]/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}
