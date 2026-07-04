import {
  CrushHero,
  DownloadSection,
  FeatureStoryGrid,
  FinalCTASection,
  HowItWorksJourney,
  LoveStoriesSection,
  PricingPreviewSection,
  SocialProofStrip,
} from './_components/landing';
import { Preloader } from './_components/motion/preloader';

/**
 * Public marketing landing page (`/`) — the "Magnetic Attraction" story.
 *
 * Act 1 (hero): two luminous particle orbs apart in deep space.
 * Act 2 (discovery): the existing features/journey sections reveal as the
 * orbs are pulled together. Act 3 (the match): collision bloom into the
 * stories/pricing/final CTA. All copy is server-rendered and visible without
 * JavaScript (the production CSP can prevent hydration on static pages); the
 * WebGL scene, preloader, and scroll choreography are progressive
 * enhancements that respect reduced motion.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <Preloader />
      <CrushHero />
      <SocialProofStrip />
      <FeatureStoryGrid />
      <HowItWorksJourney />
      <LoveStoriesSection />
      <PricingPreviewSection />
      <DownloadSection />
      <FinalCTASection />
    </div>
  );
}
