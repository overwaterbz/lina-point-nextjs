import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Lina Point',
  description: 'Terms and conditions for booking and staying at Lina Point Overwater Resort, San Pedro, Belize.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800 mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: March 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Lina Point website and booking services, you agree to be bound by these
              Terms of Service. If you do not agree, please do not use our services. &quot;Lina Point,&quot; &quot;we,&quot; or &quot;us&quot;
              refers to Lina Point Overwater Resort, operated by Point Enterprise LLC, located in San Pedro,
              Ambergris Caye, Belize.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Booking &amp; Reservations</h2>
            <p>
              All reservations are subject to availability. A valid payment method is required to confirm your booking.
              Reservation confirmations are sent via email and/or WhatsApp. Room assignments are subject to change
              based on operational needs, though we will always honor the room category booked.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Minimum stay: 2 nights</li>
              <li>Maximum stay: 30 nights per reservation</li>
              <li>Check-in: 3:00 PM · Check-out: 11:00 AM</li>
              <li>Early check-in and late check-out may be available upon request</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Cancellation &amp; Refund Policy</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>48+ hours before check-in:</strong> Full refund</li>
              <li><strong>7–48 hours before check-in:</strong> 50% refund</li>
              <li><strong>Less than 7 hours or no-show:</strong> No refund</li>
            </ul>
            <p>
              Refunds are processed to the original payment method within 5–10 business days. Tour bookings
              arranged through our concierge follow the cancellation policy of the respective tour operator
              (Dee Kay&apos;s Tours).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Payment Terms</h2>
            <p>
              We accept payments via Square and Stripe. All prices are displayed in US Dollars (USD).
              A payment hold or full charge may be applied at the time of booking. Applicable taxes and
              service fees will be displayed before you confirm.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Guest Conduct &amp; Property Rules</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Guests must be 18 years or older to book a reservation</li>
              <li>Maximum occupancy limits per room type must be respected</li>
              <li>Smoking is prohibited in all indoor areas</li>
              <li>Excessive noise after 10:00 PM is not permitted</li>
              <li>Guests are responsible for any damage to resort property during their stay</li>
              <li>Pets are not permitted on the property</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Liability Limitations</h2>
            <p>
              Lina Point is not liable for loss or damage to personal belongings. Guests participate in tours,
              water activities, and excursions at their own risk. We recommend purchasing travel insurance for
              your trip. Third-party tours booked through our concierge are operated independently, and Lina Point
              acts solely as a booking facilitator.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Intellectual Property</h2>
            <p>
              All content on this website — including text, images, logos, and design — is the property of
              Point Enterprise LLC or its licensors. You may not reproduce, distribute, or create derivative
              works without our written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Modifications</h2>
            <p>
              We reserve the right to update these Terms at any time. Changes take effect upon posting to this
              page. Continued use of our services after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of Belize. Any disputes
              arising from these Terms shall be resolved in the courts of Belize.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Contact</h2>
            <p>
              If you have questions about these Terms, contact us at{' '}
              <a href="mailto:reservations@linapoint.com" className="text-indigo-600 hover:text-indigo-800">
                reservations@linapoint.com
              </a>{' '}
              or call <a href="tel:+5016329205" className="text-indigo-600 hover:text-indigo-800">+501.632.9205</a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <Link href="/privacy" className="text-indigo-600 hover:text-indigo-800 text-sm">
            Privacy Policy &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
