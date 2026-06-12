import { Heart, MessageCircle, Sparkles } from 'lucide-react';

/**
 * Decorative hero scene: floating glass profile cards, a compatibility
 * orbit, a match notification, a chat preview, and soft heart particles.
 *
 * Purely presentational (aria-hidden) and animated with CSS keyframes only,
 * gated behind `motion-safe:` so reduced-motion users see a static scene.
 */

// Deterministic particle layout (SSR-safe — no randomness).
const PARTICLES = [
  { top: '6%', left: '12%', size: 14, delay: '0s', duration: '9s', tone: 'text-primary/40' },
  { top: '16%', left: '78%', size: 10, delay: '1.2s', duration: '7s', tone: 'text-secondary/40' },
  { top: '38%', left: '4%', size: 9, delay: '2.4s', duration: '8s', tone: 'text-secondary/30' },
  { top: '64%', left: '90%', size: 12, delay: '0.8s', duration: '10s', tone: 'text-primary/30' },
  { top: '82%', left: '16%', size: 10, delay: '1.8s', duration: '9s', tone: 'text-primary/40' },
  { top: '90%', left: '64%', size: 8, delay: '3s', duration: '7.5s', tone: 'text-secondary/40' },
  { top: '28%', left: '92%', size: 8, delay: '2s', duration: '8.5s', tone: 'text-primary/25' },
  { top: '74%', left: '44%', size: 9, delay: '0.4s', duration: '11s', tone: 'text-secondary/25' },
] as const;

export function FloatingMatchScene() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[420px] select-none">
      <div className="relative aspect-[4/5] xs:aspect-square">
        {/* Ambient glow */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.22),transparent_70%)] blur-2xl motion-safe:animate-pulse-glow" />

        {/* Compatibility orbits */}
        <div className="absolute inset-[6%] rounded-full border border-primary/15 motion-safe:animate-orbit">
          <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_2px_hsl(var(--primary)/0.6)]" />
        </div>
        <div className="absolute inset-[16%] rounded-full border border-dashed border-secondary/20 motion-safe:animate-orbit-reverse">
          <span className="absolute top-1/2 -right-1 h-2 w-2 -translate-y-1/2 rounded-full bg-secondary shadow-[0_0_10px_2px_hsl(var(--secondary)/0.6)]" />
        </div>

        {/* Heart particles */}
        {PARTICLES.map((p, i) => (
          <Heart
            key={i}
            className={`absolute fill-current motion-safe:animate-float ${p.tone}`}
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}

        {/* Secondary profile card (behind) */}
        <div className="absolute left-[2%] top-[20%] w-[44%] -rotate-[8deg] motion-safe:animate-float-slow [animation-delay:1.5s]">
          <div className="glass rounded-2xl p-3 opacity-80 shadow-lg">
            <div className="mb-2 flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/25 to-primary/15">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary text-sm font-semibold text-white">
                J
              </span>
            </div>
            <p className="text-xs font-semibold">Jordan, 25</p>
            <p className="text-[10px] text-muted-foreground">Photographer · 3 km away</p>
          </div>
        </div>

        {/* Main profile card */}
        <div className="absolute right-[4%] top-[12%] w-[56%] rotate-[6deg] motion-safe:animate-float">
          <div className="glass rounded-3xl p-4 shadow-xl ring-1 ring-primary/10">
            <div className="mb-3 flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-secondary/20">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-lg font-semibold text-white shadow-lg">
                A
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Alex, 27</p>
                <p className="text-[11px] text-muted-foreground">Designer · 2 km away</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-secondary px-2 py-0.5 text-[10px] font-semibold text-white shadow-md">
                <Sparkles className="h-2.5 w-2.5" />
                98%
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {['Hiking', 'Coffee', 'Art'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/60 bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Match notification */}
        <div className="absolute -right-1 top-[58%] motion-safe:animate-float-slow [animation-delay:0.6s]">
          <div className="glass flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 shadow-xl ring-1 ring-primary/15">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
              <Heart className="h-4 w-4 fill-white text-white" />
            </span>
            <div>
              <p className="text-xs font-semibold leading-tight">It&apos;s a match!</p>
              <p className="text-[10px] text-muted-foreground leading-tight">You and Alex like each other</p>
            </div>
          </div>
        </div>

        {/* Chat preview */}
        <div className="absolute bottom-[4%] left-[2%] w-[58%] motion-safe:animate-float [animation-delay:2.2s]">
          <div className="glass rounded-2xl p-3 shadow-xl">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium">Hey! Coffee this weekend? ☕</p>
            </div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
