import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service - Crush',
  description: 'Read the terms of service for using the Crush dating app.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-primary hover:underline mb-6"
        >
          &larr; Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="prose dark:prose-invert max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Welcome to Crush! These Terms of Service (&quot;Terms&quot;) govern your use
              of the Crush mobile application and website (&quot;App&quot; or &quot;Service&quot;) operated by
              Crush Inc. (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing or using our Service,
              you agree to be bound by these Terms.
            </p>
          </section>

          {/* Eligibility */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Eligibility
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              To use Crush, you must:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Be at least 18 years of age</li>
              <li>Be legally permitted to use the Service under applicable laws</li>
              <li>Not be prohibited from receiving services under applicable laws</li>
              <li>Not have been previously banned from the Service</li>
              <li>Not be a registered sex offender</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              By creating an account, you represent and warrant that you meet all
              eligibility requirements.
            </p>
          </section>

          {/* Account Registration */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              2. Account Registration
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              To use certain features, you must register for an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information to keep it accurate</li>
              <li>Keep your login credentials secure and confidential</li>
              <li>Notify us immediately of any unauthorized account access</li>
              <li>Be responsible for all activities that occur under your account</li>
              <li>Not share your account credentials with others</li>
            </ul>
          </section>

          {/* Community Guidelines */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Community Guidelines
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You agree to follow our Community Guidelines and not to:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Post false, misleading, or deceptive content</li>
              <li>Harass, bully, stalk, threaten, or intimidate any person</li>
              <li>Use hate speech, discriminatory language, or promote violence</li>
              <li>Share explicit, obscene, pornographic, or illegal content</li>
              <li>Spam, solicit, or advertise without permission</li>
              <li>Impersonate another person or misrepresent your identity</li>
              <li>Share others&apos; private information without their consent</li>
              <li>Use the Service for any illegal purposes</li>
              <li>Attempt to hack, disrupt, or damage the Service</li>
              <li>Create multiple accounts to evade bans or restrictions</li>
              <li>Engage in any activity that exploits, harms, or threatens minors</li>
            </ul>
          </section>

          {/* Content Ownership */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Content Ownership
            </h2>

            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
              Your Content
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You retain ownership of content you submit (&quot;User Content&quot;). By posting
              User Content, you grant us a non-exclusive, worldwide, royalty-free, sublicensable
              license to use, display, reproduce, modify, and distribute your content in connection
              with providing and promoting the Service.
            </p>

            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
              Our Content
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              All other content on the Service, including text, graphics, logos, icons,
              images, and software, is owned by us or our licensors and protected by
              intellectual property laws. You may not copy, modify, distribute, or create
              derivative works from our content without explicit written permission.
            </p>
          </section>

          {/* Subscriptions and Payments */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Subscriptions and Payments
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Crush offers both free and premium subscription options:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Subscriptions automatically renew unless cancelled before the renewal date</li>
              <li>Cancel at least 24 hours before your current period ends to avoid charges</li>
              <li>Manage and cancel subscriptions through your app store account settings</li>
              <li>Refunds are subject to the policies of Apple App Store or Google Play Store</li>
              <li>We reserve the right to change pricing with reasonable advance notice</li>
              <li>No refunds for partial subscription periods when you cancel</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              In-app purchases and subscriptions are processed through Apple App Store or Google Play Store.
              Please review their terms for detailed payment and refund policies.
            </p>
          </section>

          {/* Safety and Interactions */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Safety and Interactions
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Crush is a platform for connecting people. We provide tools and features to help
              you stay safe, but please understand that we do not:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Conduct criminal background checks on all users</li>
              <li>Verify all information provided by users</li>
              <li>Guarantee the behavior, identity, or intentions of any user</li>
              <li>Bear responsibility for user interactions that occur offline</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              <strong>You are solely responsible for your interactions with other users.</strong> We strongly
              encourage you to exercise caution, use common sense, and follow our{' '}
              <Link href="/help#safety" className="text-primary hover:underline">
                safety tips
              </Link>{' '}
              when meeting people in person.
            </p>
          </section>

          {/* Disclaimer of Warranties */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Disclaimer of Warranties
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4 uppercase text-sm">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
              OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE,
              OR THAT DEFECTS WILL BE CORRECTED. YOUR USE OF THE SERVICE IS AT YOUR OWN RISK.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Limitation of Liability
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4 uppercase text-sm">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
              BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING FROM YOUR
              USE OF OR INABILITY TO USE THE SERVICE. OUR TOTAL AGGREGATE LIABILITY SHALL NOT
              EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS OR (B) $100 USD.
            </p>
          </section>

          {/* Indemnification */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              9. Indemnification
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You agree to indemnify, defend, and hold harmless Crush and its officers,
              directors, employees, agents, and affiliates from any claims, damages, losses,
              liabilities, costs, or expenses (including reasonable attorneys&apos; fees) arising
              from your use of the Service, violation of these Terms, or infringement of
              any third-party rights.
            </p>
          </section>

          {/* Termination */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              10. Termination
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We may suspend or terminate your account at any time, with or without cause
              or notice, including for violations of these Terms. You may delete your account
              at any time through the app settings. Upon termination:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Your right to use the Service immediately ceases</li>
              <li>We may delete your account data after the applicable retention period</li>
              <li>Provisions that should survive termination (e.g., liability, indemnification) remain in effect</li>
              <li>You remain responsible for any charges incurred before termination</li>
            </ul>
          </section>

          {/* Dispute Resolution */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              11. Dispute Resolution
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Any disputes arising from these Terms or your use of the Service will be
              resolved through binding arbitration administered by JAMS under its Streamlined
              Arbitration Rules, except that either party may seek injunctive relief in court
              for intellectual property infringement. You agree to waive any right to
              participate in a class action lawsuit or class-wide arbitration.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              12. Governing Law
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              These Terms are governed by and construed in accordance with the laws of the
              State of California, USA, without regard to its conflict of law provisions.
              Any legal proceedings not subject to arbitration must be brought in the state
              or federal courts located in San Francisco County, California.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              13. Changes to Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We may modify these Terms at any time. We will notify you of material changes
              by posting the updated Terms in the app, on our website, or by email. Your
              continued use of the Service after changes take effect constitutes your
              acceptance of the new Terms. If you do not agree to the modified Terms,
              you must stop using the Service.
            </p>
          </section>

          {/* Severability */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              14. Severability
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              If any provision of these Terms is found to be unenforceable or invalid by
              a court of competent jurisdiction, that provision will be limited or eliminated
              to the minimum extent necessary, and the remaining provisions will continue
              in full force and effect.
            </p>
          </section>

          {/* Entire Agreement */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              15. Entire Agreement
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              These Terms, together with our Privacy Policy and any other agreements
              expressly incorporated by reference, constitute the entire agreement between
              you and Crush regarding your use of the Service and supersede any prior
              agreements.
            </p>
          </section>

          {/* Contact Us */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              16. Contact Us
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              If you have any questions about these Terms of Service, please contact us at:{' '}
              <a
                href="mailto:legal@crush.app"
                className="text-primary hover:underline"
              >
                legal@crush.app
              </a>
            </p>
          </section>

          {/* Acknowledgment */}
          <section className="mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              By using Crush, you acknowledge that you have read, understood, and agree
              to be bound by these Terms of Service.
            </p>
          </section>

          {/* Related Links */}
          <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
              Related Documents
            </h3>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/privacy"
                className="text-primary hover:underline"
              >
                Privacy Policy
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
