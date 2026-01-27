import { Metadata } from 'next';
import Link from 'next/link';

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
        <p className="text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="prose dark:prose-invert max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Your Privacy Matters
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Crush (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard
              your information when you use our mobile application and website (collectively, the &quot;Service&quot;).
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Information We Collect
            </h2>

            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
              Personal Information You Provide
            </h3>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Account information: name, email address, phone number, date of birth</li>
              <li>Profile information: photos, bio, interests, relationship preferences</li>
              <li>Verification data: ID documents for identity verification (optional)</li>
              <li>Communications: messages, reports, and support requests</li>
              <li>Payment information: processed securely through third-party payment providers</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
              Information Collected Automatically
            </h3>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Location data: to show you nearby users (with your permission)</li>
              <li>Device information: device type, operating system, unique device identifiers</li>
              <li>Usage data: app interactions, features used, time spent on the Service</li>
              <li>Log data: IP address, access times, pages viewed, crash reports</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Provide, maintain, and improve our matchmaking services</li>
              <li>Show you relevant profiles based on your preferences and location</li>
              <li>Process your transactions and manage your account</li>
              <li>Send you service updates, notifications, and promotional messages</li>
              <li>Verify your identity and prevent fraud and abuse</li>
              <li>Respond to your requests and provide customer support</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Information Sharing
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              <strong>We do not sell your personal information to third parties.</strong> We may share your information with:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li><strong>Other users:</strong> Your profile information is visible to potential matches as part of the dating service</li>
              <li><strong>Service providers:</strong> Companies that help us operate (hosting, analytics, payment processing, customer support)</li>
              <li><strong>Legal authorities:</strong> When required by law, legal process, or to protect our rights and safety</li>
              <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of company assets</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Data Retention
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We retain your personal information for as long as your account is active
              or as needed to provide you services. After account deletion, we retain
              certain information for up to 14 days for recovery purposes, after which
              it is permanently deleted. Some data may be retained longer as required
              by law or for legitimate business purposes (e.g., fraud prevention).
            </p>
          </section>

          {/* Your Rights and Choices */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Your Rights and Choices
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
              <li><strong>Location:</strong> Control location sharing through your device settings</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              To exercise these rights, visit Settings &gt; Account &gt; Account Actions in the app,
              or contact us at the email below.
            </p>
          </section>

          {/* Data Security */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Data Security
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Secure authentication with phone and email verification</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls limiting employee access to user data</li>
              <li>Secure infrastructure hosted on trusted cloud providers</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              While we strive to protect your information, no method of transmission
              over the internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Children&apos;s Privacy
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Crush is intended for users 18 years of age and older. We do not knowingly
              collect personal information from anyone under 18. If we learn that we have
              collected personal information from a child under 18, we will delete that
              information immediately. If you believe we have collected information from
              a minor, please contact us.
            </p>
          </section>

          {/* International Transfers */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              8. International Data Transfers
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your information may be transferred to and processed in countries other
              than your own. We ensure appropriate safeguards are in place to protect
              your information in compliance with applicable data protection laws,
              including standard contractual clauses where required.
            </p>
          </section>

          {/* California Privacy Rights */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              9. California Privacy Rights (CCPA)
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              California residents have additional rights under the California Consumer
              Privacy Act (CCPA), including the right to know what personal information
              we collect, the right to request deletion, and the right to opt-out of the
              sale of personal information. <strong>We do not sell personal information.</strong>
            </p>
          </section>

          {/* European Privacy Rights */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              10. European Privacy Rights (GDPR)
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Users in the European Economic Area (EEA) have rights under the General
              Data Protection Regulation (GDPR), including access, rectification, erasure,
              restriction of processing, data portability, and the right to object.
              You may also lodge a complaint with your local data protection authority.
            </p>
          </section>

          {/* Cookies and Tracking */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              11. Cookies and Tracking Technologies
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Our website uses cookies and similar tracking technologies to enhance your
              experience, analyze usage, and deliver personalized content. You can control
              cookie preferences through your browser settings. Note that disabling cookies
              may affect some features of the Service.
            </p>
          </section>

          {/* Changes to Policy */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              12. Changes to This Policy
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We may update this Privacy Policy from time to time. We will notify you
              of any material changes by posting the new policy on this page, in the app,
              and updating the &quot;Last updated&quot; date. Your continued use of the Service
              after changes take effect constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact Us */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              13. Contact Us
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              If you have any questions about this Privacy Policy or our data practices,
              please contact us at:{' '}
              <a
                href="mailto:privacy@crush.app"
                className="text-primary hover:underline"
              >
                privacy@crush.app
              </a>
            </p>
          </section>

          {/* Related Links */}
          <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
              Related Documents
            </h3>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/terms"
                className="text-primary hover:underline"
              >
                Terms of Service
              </Link>
              <Link
                href="/help#safety"
                className="text-primary hover:underline"
              >
                Safety Guidelines
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
