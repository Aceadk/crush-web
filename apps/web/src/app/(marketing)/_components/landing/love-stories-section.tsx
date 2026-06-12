import { Quote, Star } from 'lucide-react';
import { Reveal } from './reveal';

const STORIES = [
  {
    quote:
      'I was skeptical about dating apps until I tried Crush. The quality of matches is incredible - I met my boyfriend within two weeks!',
    author: 'Sarah M.',
    location: 'New York, NY',
    initials: 'SM',
  },
  {
    quote:
      "What I love about Crush is that people actually want to have real conversations. Not just 'hey'. We're getting married next spring!",
    author: 'Michael T.',
    location: 'Los Angeles, CA',
    initials: 'MT',
  },
  {
    quote:
      'The safety features gave me so much peace of mind. I felt comfortable being myself, and that\'s how I found my soulmate.',
    author: 'Emily R.',
    location: 'Chicago, IL',
    initials: 'ER',
  },
] as const;

/**
 * "Love Stories From Crush" — gradient-bordered cards with illustrated
 * initials avatars (deliberately non-photographic placeholders).
 */
export function LoveStoriesSection() {
  return (
    <section className="relative overflow-hidden bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-6rem] top-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Love Stories From <span className="text-gradient">Crush</span>
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Hear from real couples who found each other on Crush
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {STORIES.map(({ quote, author, location, initials }, i) => (
            <Reveal key={author} delay={i * 120}>
              <div className="group h-full rounded-2xl bg-gradient-to-br from-primary/25 via-border to-secondary/25 p-px transition-shadow duration-300 hover:shadow-[0_12px_48px_-16px_hsl(var(--primary)/0.35)]">
                <div className="relative flex h-full flex-col rounded-[calc(theme(borderRadius.2xl)-1px)] bg-card p-6">
                  <Quote
                    aria-hidden="true"
                    className="absolute right-5 top-5 h-8 w-8 text-primary/10 transition-colors duration-300 group-hover:text-primary/20"
                  />
                  <div className="mb-4 flex items-center gap-0.5" aria-label="Rated 5 out of 5 stars" role="img">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="mb-6 flex-1 text-sm leading-relaxed text-foreground">
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-semibold text-white"
                    >
                      {initials}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{author}</p>
                      <p className="text-xs text-muted-foreground">{location}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
