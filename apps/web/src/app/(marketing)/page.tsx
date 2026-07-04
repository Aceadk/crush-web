import {
  CrushHero,
  DownloadSection,
  FeatureStoryGrid,
  FinalCTASection,
  HowItWorksJourney,
  LoveStoriesSection,
  MatchMoment,
  PricingPreviewSection,
  SocialProofStrip,
} from './_components/landing';
import { MagneticScene } from './_components/three/magnetic-scene';
import { LenisProvider } from './_components/motion/lenis-provider';
import { ScrollDirector } from './_components/motion/scroll-director';
import { Preloader } from './_components/motion/preloader';
import { CursorGlow } from './_components/motion/cursor-glow';
import { GrainOverlay } from './_components/motion/grain-overlay';

/**
 * Public marketing landing page (`/`) — the "Magnetic Attraction" story.
 *
 * A page-fixed WebGL particle scene sits behind everything: two luminous orbs
 * that the ScrollDirector pulls together as the visitor scrolls.
 *   Act 1 (#act-1): hero — the orbs apart in deep space.
 *   Act 2 (#act-2): discovery — proof/features/journey sections reveal while
 *   the orbs drift, then orbit, then accelerate toward each other.
 *   Act 3 (#the-match → end): collision bloom ("It's a match."), landing on
 *   stories, pricing, download and the final CTA over the dimming afterglow.
 *
 * The whole page is scoped `dark` (class strategy) so every existing section
 * renders its dark-token variant. All copy is server-rendered and visible
 * without JavaScript (production CSP can prevent hydration on static pages);
 * the scene, smooth scroll and scrubbed reveals are progressive enhancements
 * that respect reduced motion.
 */
export default function HomePage() {
  return (
    <div className="dark relative min-h-screen overflow-x-clip bg-[#0d0e12] text-foreground">
      <Preloader />
      <LenisProvider />
      <ScrollDirector />

      {/* Persistent scene behind the whole narrative. */}
      <div id="magnetic-stage" className="fixed inset-0 z-0">
        <MagneticScene className="absolute inset-0" />
      </div>
      <CursorGlow />
      <GrainOverlay />

      <div className="relative z-10">
        <div id="act-1">
          <CrushHero />
        </div>

        <div id="act-2">
          <SocialProofStrip />
          <FeatureStoryGrid />
          <HowItWorksJourney />
        </div>

        <MatchMoment />
        <LoveStoriesSection />
        <PricingPreviewSection />
        <DownloadSection />
        <FinalCTASection />
      </div>
    </div>
  );
}
