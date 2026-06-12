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

/**
 * Public marketing landing page (`/`).
 *
 * Cinematic scroll story: hero → proof → features → journey → stories →
 * pricing → download → conversion → footer. Sections live in
 * `_components/landing`. All content is visible without JavaScript (the
 * production CSP can prevent hydration on static pages); scroll reveals and
 * parallax are progressive enhancements that respect reduced motion.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background">
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
