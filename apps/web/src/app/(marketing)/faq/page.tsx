import type { Metadata } from 'next';
import { FAQContent } from './faq-content';
import { faqs } from './faq-data';

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

// FAQ Schema.org structured data — generated from faq-data so every
// published question is included (previously only 5 of 31 were).
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
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
