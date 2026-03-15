import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Unsubscribe | Lina Point",
  description: "You have been unsubscribed from the Lina Point newsletter.",
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const done = status === "done";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        {done ? (
          <>
            <div className="text-5xl mb-6">🌊</div>
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-4">
              You&apos;ve been unsubscribed
            </h1>
            <p className="text-gray-600 mb-8">
              We&apos;re sorry to see you go. You won&apos;t receive any more newsletters from Lina Point.
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-6">📬</div>
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-4">
              Newsletter Preferences
            </h1>
            <p className="text-gray-600 mb-8">
              Use the link in your newsletter email to manage your subscription.
            </p>
          </>
        )}
        <Link
          href="/"
          className="inline-block bg-teal-600 hover:bg-teal-500 text-white rounded-lg px-6 py-3 text-sm font-semibold transition"
        >
          Back to Lina Point
        </Link>
      </div>
    </div>
  );
}
