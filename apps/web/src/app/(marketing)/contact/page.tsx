import type { Metadata } from 'next';
import { ContactContent } from './contact-content';

export const metadata: Metadata = {
  title: 'Contact Us - Crush Dating App Support',
  description:
    'Get in touch with Crush support. Whether you have questions, feedback, or need help with your account, our team is here for you. Response within 24 hours.',
  openGraph: {
    title: 'Contact Crush - We\'re Here to Help',
    description:
      'Have questions or feedback? Our support team is ready to assist you. Response within 24 hours.',
    type: 'website',
  },
  twitter: {
    title: 'Contact Crush - We\'re Here to Help',
    description:
      'Have questions or feedback? Our support team is ready to assist you. Response within 24 hours.',
  },
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactPage() {
  return <ContactContent />;
}
