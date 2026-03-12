import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Lina Point',
  description: 'How Lina Point Overwater Resort collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800 mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: March 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
            <p>When you use Lina Point&apos;s website and services, we may collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account information:</strong> Name, email address, phone number, and password when you create an account</li>
              <li><strong>Booking details:</strong> Room preferences, travel dates, group size, activity interests, and payment information</li>
              <li><strong>Communication data:</strong> WhatsApp messages exchanged with our AI concierge, email correspondence, and feedback</li>
              <li><strong>Usage data:</strong> Pages visited, features used, browser type, and device information via cookies and analytics</li>
              <li><strong>Guest intelligence:</strong> Dietary preferences, special requests, past stay history, and loyalty program data to personalize your experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Process and manage your reservations and payments</li>
              <li>Provide personalized concierge recommendations via WhatsApp and email</li>
              <li>Send booking confirmations, pre-arrival packets, and post-stay follow-ups</li>
              <li>Improve our AI-powered services and guest experience</li>
              <li>Communicate promotional offers (you may opt out at any time)</li>
              <li>Detect and prevent fraud or unauthorized access</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Third-Party Service Providers</h2>
            <p>We share data with trusted third parties to operate our services:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Supabase:</strong> Database hosting and user authentication</li>
              <li><strong>Square &amp; Stripe:</strong> Secure payment processing</li>
              <li><strong>Twilio:</strong> WhatsApp messaging delivery</li>
              <li><strong>Resend:</strong> Transactional email delivery</li>
              <li><strong>Meta (Instagram/Facebook):</strong> Social media integration</li>
              <li><strong>Vercel:</strong> Website hosting and serverless functions</li>
            </ul>
            <p>
              Each provider processes data in accordance with their own privacy policies. We do not
              sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. AI &amp; Automated Processing</h2>
            <p>
              Lina Point uses AI-powered agents to personalize your experience. This includes automated
              pricing adjustments, tour recommendations, and concierge responses. Your WhatsApp conversations
              with our AI concierge are processed to provide relevant assistance and improve service quality.
              You may request human assistance at any time by messaging &quot;speak to a human.&quot;
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Cookies &amp; Analytics</h2>
            <p>
              We use essential cookies to maintain your session and preferences. Analytics data (page views,
              feature usage) helps us improve the website. You can manage cookie preferences through your
              browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Data Retention</h2>
            <p>
              We retain your account and booking data for as long as your account is active or as needed to
              provide services. Reservation records are kept for 7 years for legal and accounting purposes.
              WhatsApp conversation logs are retained for 12 months. You may request deletion of your account
              and personal data at any time (see Your Rights below).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
            </ul>
            <p>
              To exercise any of these rights, email us at{' '}
              <a href="mailto:reservations@linapoint.com" className="text-indigo-600 hover:text-indigo-800">
                reservations@linapoint.com
              </a>.
              We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption in transit (TLS),
              encrypted payment processing, row-level security on our database, and secure authentication.
              No system is 100% secure, and we cannot guarantee absolute data security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Children&apos;s Privacy</h2>
            <p>
              Our services are not directed at individuals under 18. We do not knowingly collect personal
              information from children. If you believe we have collected data from a minor, please contact
              us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes take effect upon posting.
              We will notify registered users of material changes via email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Contact</h2>
            <p>
              For privacy-related inquiries, contact us at{' '}
              <a href="mailto:reservations@linapoint.com" className="text-indigo-600 hover:text-indigo-800">
                reservations@linapoint.com
              </a>{' '}
              or call <a href="tel:+5016329205" className="text-indigo-600 hover:text-indigo-800">+501.632.9205</a>.
            </p>
            <p className="mt-2">
              Lina Point Overwater Resort<br />
              Point Enterprise LLC<br />
              San Pedro, Ambergris Caye<br />
              Belize, Central America
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <Link href="/terms" className="text-indigo-600 hover:text-indigo-800 text-sm">
            &larr; Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
