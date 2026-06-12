import { Bell, Check, Heart, MessageCircle, Sparkles } from 'lucide-react';
import { Reveal } from './reveal';

const TRUST_POINTS = ['Free to download', 'No ads', 'Secure'] as const;

/**
 * Download section (canonical `/#download` destination).
 *
 * Copy is intentionally aligned with the badge state: the store badges say
 * "Coming Soon", so the section frames mobile apps as launching soon instead
 * of claiming availability. Badges stay non-interactive until real store
 * links exist.
 */
export function DownloadSection() {
  return (
    <section
      id="download"
      className="relative scroll-mt-20 overflow-hidden bg-muted/30 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[10%] top-[20%] h-72 w-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Reveal>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent/80 px-3.5 py-1.5 text-xs font-medium text-accent-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Coming soon to iOS &amp; Android</span>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Get <span className="text-gradient">Crush</span> on Your Phone
              </h2>
            </Reveal>

            <Reveal delay={200}>
              <p className="mb-8 max-w-lg text-muted-foreground">
                The Crush mobile app is on its way to the App Store and Google Play.
                Soon you&apos;ll be able to swipe, match, and chat wherever you go.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mb-8 flex flex-wrap gap-4">
                {/* App Store badge (not yet live — intentionally non-interactive) */}
                <span
                  className="relative inline-flex cursor-default items-center gap-3 rounded-xl bg-foreground/80 px-5 py-3 text-background"
                  aria-label="App Store - Coming Soon"
                >
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <span className="text-left">
                    <span className="block text-[10px] opacity-80">Coming Soon on</span>
                    <span className="-mt-0.5 block text-base font-semibold">App Store</span>
                  </span>
                </span>

                {/* Google Play badge (not yet live — intentionally non-interactive) */}
                <span
                  className="relative inline-flex cursor-default items-center gap-3 rounded-xl bg-foreground/80 px-5 py-3 text-background"
                  aria-label="Google Play - Coming Soon"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M3.609 1.814L13.792 12 3.609 22.186a.996.996 0 01-.609-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.807 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.991l-2.302 2.302-8.634-8.635z" />
                  </svg>
                  <span className="text-left">
                    <span className="block text-[10px] opacity-80">Coming Soon on</span>
                    <span className="-mt-0.5 block text-base font-semibold">Google Play</span>
                  </span>
                </span>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {TRUST_POINTS.map((point) => (
                  <div key={point} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" aria-hidden="true" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Phone mockup */}
          <Reveal delay={200} direction="none">
            <div aria-hidden="true" className="relative flex justify-center select-none">
              <div
                className="pointer-events-none absolute top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.25),transparent_70%)] blur-2xl motion-safe:animate-pulse-glow"
              />
              <div className="relative">
                {/* Phone frame */}
                <div className="w-64 rounded-[3rem] border border-border/60 bg-gradient-to-br from-foreground/5 to-foreground/10 p-3 shadow-2xl backdrop-blur">
                  <div className="flex h-[500px] flex-col overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-primary/15 via-background/60 to-secondary/15">
                    {/* Mini app UI */}
                    <div className="flex items-center justify-between px-5 pt-6">
                      <div className="flex items-center gap-1.5">
                        <Heart className="h-4 w-4 fill-primary text-primary" />
                        <span className="text-sm font-semibold text-gradient">Crush</span>
                      </div>
                      <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-1 items-center justify-center p-5">
                      <div className="glass w-full rounded-3xl p-4 shadow-lg">
                        <div className="mb-3 flex h-36 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-secondary/20">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-base font-semibold text-white">
                            S
                          </span>
                        </div>
                        <p className="text-sm font-semibold">Sam, 26</p>
                        <p className="text-[11px] text-muted-foreground">Loves live music · 1 km away</p>
                        <div className="mt-3 flex items-center justify-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/70 text-muted-foreground">
                            ✕
                          </span>
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg">
                            <Heart className="h-5 w-5 fill-white text-white" />
                          </span>
                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/70 text-secondary">
                            ★
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="pb-6 text-center text-[11px] text-muted-foreground">
                      Find your perfect match
                    </p>
                  </div>
                </div>

                {/* Floating cards */}
                <div className="absolute -right-8 top-20 motion-safe:animate-float">
                  <div className="glass flex items-center gap-2 rounded-xl border border-border p-3 shadow-lg">
                    <Heart className="h-5 w-5 fill-primary text-primary" />
                    <span className="text-sm font-medium">New Match!</span>
                  </div>
                </div>
                <div className="absolute -left-8 bottom-32 motion-safe:animate-float-slow [animation-delay:1.4s]">
                  <div className="glass flex items-center gap-2 rounded-xl border border-border p-3 shadow-lg">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Hey there! 👋</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
