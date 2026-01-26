import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crush - Find Your Match',
  description:
    'Crush is a modern dating app designed to help you find meaningful connections. Swipe, match, and chat with people who share your interests.',
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
