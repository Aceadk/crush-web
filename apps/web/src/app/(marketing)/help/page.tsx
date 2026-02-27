import { Metadata } from 'next';
import { HelpContent } from './help-content';

export const metadata: Metadata = {
  title: 'Help Center - Crush',
  description: 'Get help with your Crush account, matches, messages, and more.',
};

export default function HelpPage() {
  return <HelpContent />;
}
