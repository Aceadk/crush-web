import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Crush',
  description: 'Read the terms of service for using Crush dating app.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-gray-500 mb-8">Last updated: January 2025</p>

        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              By accessing or using Crush, you agree to be bound by these Terms of Service
              and all applicable laws and regulations. If you do not agree with any of
              these terms, you are prohibited from using this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              2. Eligibility
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You must be at least 18 years old to use Crush. By using our service, you
              represent and warrant that you are at least 18 years of age and have the
              legal capacity to enter into these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              3. User Accounts
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You are responsible for maintaining the confidentiality of your account
              credentials and for all activities that occur under your account. You agree
              to:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your password</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Not share your account with others</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              4. User Conduct
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You agree not to engage in any of the following prohibited activities:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Harassment, bullying, or intimidation of other users</li>
              <li>Posting false, misleading, or fraudulent content</li>
              <li>Impersonating another person or entity</li>
              <li>Spamming or soliciting other users</li>
              <li>Uploading illegal or inappropriate content</li>
              <li>Attempting to circumvent security measures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Content
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You retain ownership of content you post on Crush. By posting content, you
              grant us a non-exclusive, worldwide, royalty-free license to use, display,
              and distribute your content in connection with the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Premium Subscriptions
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Premium features are available through subscription. Subscriptions
              automatically renew unless cancelled. You may cancel at any time through
              your account settings. Refunds are handled according to the platform
              through which you subscribed.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Termination
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We may terminate or suspend your account at any time for violations of
              these Terms or for any other reason at our discretion. You may delete your
              account at any time through the app settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Disclaimers
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Crush is provided &quot;as is&quot; without warranties of any kind. We do not
              guarantee that you will find a match or that all users are who they claim
              to be. Always exercise caution when meeting people online.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              9. Contact
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              If you have any questions about these Terms, please contact us at{' '}
              <a
                href="mailto:legal@crush.app"
                className="text-primary hover:underline"
              >
                legal@crush.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
