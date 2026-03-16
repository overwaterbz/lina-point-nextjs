import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/resort/Navbar';
import Footer from '@/components/resort/Footer';
import { createServerSupabaseClient } from '@/../lib/supabase-server';

export const metadata: Metadata = {
  title: 'Blog | Lina Point Overwater Resort',
  description: 'Travel tips, Belize destination guides, and insider stories from the Caribbean\'s premier overwater resort.',
  openGraph: {
    title: 'Blog | Lina Point Overwater Resort',
    description: 'Travel tips, Belize destination guides, and insider stories from the Caribbean\'s premier overwater resort.',
    url: 'https://linapoint.com/blog',
    type: 'website',
  },
};

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string;
  published_at: string;
  author: string;
}

export const revalidate = 3600; // revalidate every hour

export default async function BlogPage() {
  const supabase = await createServerSupabaseClient();
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, cover_image, category, published_at, author')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(20);

  const blogPosts: BlogPost[] = posts ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Lina Point Resort Blog",
    url: "https://linapoint.com/blog",
    description: "Travel tips, destination guides, and insider stories from Belize.",
    publisher: {
      "@type": "Organization",
      name: "Lina Point Belize Overwater Resort",
      url: "https://linapoint.com",
    },
    blogPost: blogPosts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `https://linapoint.com/blog/${p.slug}`,
      datePublished: p.published_at,
      author: { "@type": "Person", name: p.author },
      ...(p.cover_image ? { image: p.cover_image } : {}),
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://linapoint.com" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://linapoint.com/blog" },
    ],
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-b from-sky-50 to-white pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[10px] tracking-[0.5em] uppercase text-sky-600 mb-4">
            Stories & Guides
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            The Lina Point Blog
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Travel tips, Belize destination guides, and insider stories from
            the Caribbean&apos;s premier overwater resort.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          {blogPosts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">
                New stories coming soon. Stay tuned!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block"
                >
                  <article className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {post.cover_image && (
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={post.cover_image}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <span className="text-[10px] tracking-[0.3em] uppercase text-sky-600 font-medium">
                        {post.category.replace('-', ' ')}
                      </span>
                      <h2 className="font-display text-xl font-bold text-gray-900 mt-2 mb-3 group-hover:text-sky-700 transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-gray-500 text-sm line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                        <span>{post.author}</span>
                        <time dateTime={post.published_at}>
                          {new Date(post.published_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </time>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sky-700 py-16 text-center text-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-bold mb-4">
            Ready for Your Belize Adventure?
          </h2>
          <p className="text-white/70 mb-8">
            Book direct and save at least 6% compared to any OTA.
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
