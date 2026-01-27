import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Crush',
  description: 'Learn how Crush collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-gray-500 mb-8">Last updated: January 2025</p>

        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Information We Collect
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Account information (name, email, phone number)</li>
              <li>Profile information (photos, bio, interests)</li>
              <li>Location data (with your permission)</li>
              <li>Messages and communications</li>
              <li>Payment information (processed securely by our payment providers)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Match you with other users based on preferences</li>
              <li>Send you notifications and updates</li>
              <li>Respond to your questions and requests</li>
              <li>Detect and prevent fraud and abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Information Sharing
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>With other users as part of the matching process</li>
              <li>With service providers who assist in operating our service</li>
              <li>When required by law or to protect our rights</li>
              <li>In connection with a merger or acquisition</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Your Choices
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You have several choices regarding your information:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Update or correct your profile information at any time</li>
              <li>Control your location sharing preferences</li>
              <li>Opt out of marketing communications</li>
              <li>Request deletion of your account and data</li>
              <li>Control visibility settings for your profile</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Data Security
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We implement appropriate technical and organizational measures to protect
              your personal information against unauthorized access, alteration,
              disclosure, or destruction. However, no method of transmission over the
              Internet is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Data Retention
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We retain your information for as long as your account is active or as
              needed to provide you services. We may retain certain information as
              required by law or for legitimate business purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              7. International Transfers
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your information may be transferred to and processed in countries other
              than your own. We ensure appropriate safeguards are in place to protect
              your information in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Children&apos;s Privacy
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Crush is not intended for users under 18 years of age. We do not knowingly
              collect information from children under 18. If you believe we have
              collected information from a child under 18, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              9. Changes to This Policy
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of
              any changes by posting the new Privacy Policy on this page and updating the
              &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              10. Contact Us
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a
                href="mailto:privacy@crush.app"
                className="text-primary hover:underline"
              >
                privacy@crush.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
