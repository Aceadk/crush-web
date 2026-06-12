import { Star } from 'lucide-react';
import { Reveal } from './reveal';

const METRICS = [
  { value: '4.8', label: 'App Store', stars: true },
  { value: '1M+', label: 'Downloads', stars: false },
  { value: '50K+', label: 'Matches Daily', stars: false },
] as const;

/**
 * Premium metrics band below the hero. Numbers mirror the existing
 * landing-page claims — no new figures are introduced here.
 */
export function SocialProofStrip() {
  return (
    <section className="relative border-y border-border/60 bg-muted/30">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-4 sm:gap-8">
          {METRICS.map((metric, i) => (
            <Reveal key={metric.label} delay={i * 120}>
              <div className="text-center">
                <div className="text-2xl font-semibold tracking-tight text-gradient sm:text-4xl">
                  {metric.value}
                </div>
                {metric.stars && (
                  <div className="my-1.5 flex items-center justify-center gap-0.5" aria-hidden="true">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="h-3 w-3 fill-warning text-warning sm:h-3.5 sm:w-3.5" />
                    ))}
                  </div>
                )}
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{metric.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
