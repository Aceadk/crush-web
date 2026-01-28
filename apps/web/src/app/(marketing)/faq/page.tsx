import type { Metadata } from 'next';
import { FAQContent } from './faq-content';

export const metadata: Metadata = {
  title: 'FAQ - Crush Dating App Help Center',
  description:
    'Find answers to frequently asked questions about Crush dating app. Learn about matching, messaging, premium features, safety, billing, and account management.',
  openGraph: {
    title: 'Crush FAQ - Get Your Questions Answered',
    description:
      'Find answers to common questions about Crush. Matching, messaging, premium features, safety, and more.',
    type: 'website',
  },
  twitter: {
    title: 'Crush FAQ - Get Your Questions Answered',
    description:
      'Find answers to common questions about Crush. Matching, messaging, premium features, safety, and more.',
  },
  alternates: {
    canonical: '/faq',
  },
};

// FAQ Schema.org structured data
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Crush free to use?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! Crush is free to download and use. You can create a profile, swipe on potential matches, and chat with your matches without paying anything.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does matching work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "When you and another person both swipe right (like) on each other, it's a match! You'll both be notified and can start chatting.",
      },
    },
    {
      '@type': 'Question',
      name: 'What features do I get with Crush+?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Crush+ includes: See who likes you, unlimited rewinds, 5 Super Likes per day, Passport mode, 1 profile boost per month, and no ads.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I report someone?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'To report a user, go to their profile or your conversation with them, tap the "..." menu, and select "Report."',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I cancel my subscription anytime?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes, you can cancel anytime. You'll keep your premium features until the end of your current billing period.",
      },
    },
  ],
};

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <FAQContent />
    </>
  );
}
