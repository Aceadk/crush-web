import { Heart, MessageCircle, UserCheck } from 'lucide-react';
import { Reveal } from './reveal';

const STEPS = [
  {
    icon: UserCheck,
    title: 'Create Your Profile',
    description:
      'Sign up in seconds and build a profile that shows off the real you. Add photos, answer prompts, and share your interests.',
  },
  {
    icon: Heart,
    title: 'Discover Matches',
    description:
      'Swipe through profiles tailored to your preferences. Like someone? Swipe right. Not interested? Swipe left.',
  },
  {
    icon: MessageCircle,
    title: 'Start Chatting',
    description:
      "When you both like each other, it's a match! Break the ice and start a conversation that could change your life.",
  },
] as const;

/** "How Crush Works" — a three-step journey with a connecting gradient path. */
export function HowItWorksJourney() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-8rem] top-1/3 h-72 w-72 rounded-full bg-secondary/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl">
        <Reveal>
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              How <span className="text-gradient">Crush</span> Works
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Finding love has never been easier. Just three simple steps.
            </p>
          </div>
        </Reveal>

        <div className="relative">
          {/* Connecting path (desktop) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-px bg-gradient-to-r from-primary/50 via-secondary/50 to-primary/50 md:block"
          />

          <ol className="grid gap-12 md:grid-cols-3 md:gap-8">
            {STEPS.map(({ icon: Icon, title, description }, i) => (
              <li key={title}>
                <Reveal delay={i * 150}>
                  <div className="group relative text-center">
                    <div className="relative mb-6 inline-flex">
                      <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/15 to-secondary/15 text-primary backdrop-blur transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100">
                        <Icon className="h-7 w-7" aria-hidden="true" />
                      </div>
                      <div className="absolute -right-2.5 -top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.6)]">
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="mb-2 text-base font-semibold">{title}</h3>
                    <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
