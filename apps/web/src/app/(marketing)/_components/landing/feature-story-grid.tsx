import { Eye, Globe, Heart, MessageCircle, Rewind, Shield } from 'lucide-react';
import { Reveal } from './reveal';
import { SectionLabel } from '../motion/section-label';

const FEATURES = [
  {
    icon: Heart,
    title: 'Smart Matching',
    description:
      'Our algorithm learns your preferences to show you compatible matches based on interests, values, and lifestyle.',
  },
  {
    icon: MessageCircle,
    title: 'Meaningful Conversations',
    description:
      'Break the ice with profile prompts and start conversations that matter. No more awkward openers.',
  },
  {
    icon: Shield,
    title: 'Safe & Secure',
    description:
      'Photo verification, profile moderation, and robust reporting tools keep our community safe.',
  },
  {
    icon: Eye,
    title: 'See Who Likes You',
    description:
      "No more guessing! Premium members can see everyone who's already interested in them.",
  },
  {
    icon: Rewind,
    title: 'Undo Swipes',
    description:
      'Changed your mind? Use rewind to take back your last swipe and get a second chance.',
  },
  {
    icon: Globe,
    title: 'Passport Mode',
    description:
      'Match with people anywhere in the world. Perfect for planning trips or long-distance connections.',
  },
] as const;

/** "Why Choose Crush" — premium interactive feature cards. */
export function FeatureStoryGrid() {
  return (
    <section id="why-crush" className="relative scroll-mt-14 overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-primary/5 blur-3xl"
      />
      <div className="relative mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-14 text-center">
            <SectionLabel index="02" className="mb-5">
              Discovery
            </SectionLabel>
            <h2 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Why Choose <span className="text-gradient">Crush</span>?
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              We&apos;ve designed every feature to help you find meaningful connections
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }, i) => (
            <Reveal key={title} delay={(i % 3) * 100}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card/70 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_12px_48px_-16px_hsl(var(--primary)/0.4)] motion-reduce:hover:translate-y-0">
                {/* Hover glow accent */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <div className="relative">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary ring-1 ring-primary/10 transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
