import { RuntimeProviders } from '@/shared/providers/runtime-providers';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RuntimeProviders>{children}</RuntimeProviders>;
}
