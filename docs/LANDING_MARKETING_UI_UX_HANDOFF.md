# Crush Public Landing and Marketing UI/UX Handoff

## Purpose

This document describes the public-facing Crush web experience as it is currently
implemented. It is intended as a handoff for an agent redesigning the feel,
navigation, presentation, or UX of the landing and marketing pages.

Account-entry controls and all non-public dating-app screens are deliberately
outside this document's scope.

## Scope

### Main landing page

- `/`
- The `Learn More` flow from the landing hero

### Product

- `/features`
- `/pricing`
- `/#download`

### Company

- `/about`
- `/contact`
- `/faq`
- `/help`, because it is directly reachable from Contact, FAQ, Guidelines, and
  the legal pages

### Legal and trust

- `/privacy`
- `/terms`
- `/safety`
- `/guidelines`

## Primary Source Files

| Area | File |
| --- | --- |
| Landing page | `apps/web/src/app/(marketing)/page.tsx` |
| Marketing route wrapper | `apps/web/src/app/(marketing)/layout.tsx` |
| Features | `apps/web/src/app/(marketing)/features/features-content.tsx` |
| Pricing | `apps/web/src/app/(marketing)/pricing/pricing-content.tsx` |
| Billing data | `packages/core/src/config/billing.ts` |
| About | `apps/web/src/app/(marketing)/about/page.tsx` |
| Contact | `apps/web/src/app/(marketing)/contact/contact-content.tsx` |
| FAQ | `apps/web/src/app/(marketing)/faq/faq-content.tsx` |
| Help Center | `apps/web/src/app/(marketing)/help/help-content.tsx` |
| Privacy | `apps/web/src/app/(marketing)/privacy/page.tsx` |
| Terms | `apps/web/src/app/(marketing)/terms/page.tsx` |
| Safety | `apps/web/src/app/(marketing)/safety/page.tsx` |
| Guidelines | `apps/web/src/app/(marketing)/guidelines/page.tsx` |
| Global styles and tokens | `apps/web/src/styles/globals.css` |
| Tailwind theme | `apps/web/tailwind.config.ts` |
| Brand constants | `apps/web/src/lib/brand.ts` |
| Root metadata/providers | `apps/web/src/app/layout.tsx` |
| Cookie banner | `apps/web/src/shared/components/cookie-consent.tsx` |
| Theme control | `apps/web/src/shared/components/theme/theme-switcher.tsx` |
| Public sitemap | `apps/web/src/app/sitemap.ts` |

---

## Public Experience Summary

The public web experience currently presents Crush as a modern, friendly,
safety-conscious dating product focused on meaningful connections.

The dominant visual style is:

- Minimal, centered, and content-first
- White or near-black backgrounds depending on theme
- Pink-to-purple brand gradients
- Soft gray alternating sections
- Rounded cards with thin borders
- Small line icons from Lucide
- Compact typography using Inter
- Limited animation and no large photographic hero

The landing page is primarily a long-form marketing page. It uses social proof,
feature explanations, a three-step usage explanation, testimonials, a pricing
preview, a download section, and a footer to move visitors through the public
site.

There is currently no single shared public-page shell. Some public pages have the
main fixed header and footer, while others render as isolated content pages.
This inconsistency is one of the largest contributors to the current public-site
feel.

---

## Information Architecture and Navigation Flow

### Landing page public links

```text
/
├── Learn More → /features
├── Features → /features
├── Pricing → /pricing
├── About → /about
├── Safety → /safety
├── Download → /#download
├── Contact → /contact
├── FAQ → /faq
├── Privacy Policy → /privacy
├── Terms of Service → /terms
├── Guidelines → /guidelines
├── Twitter → external, new tab
└── Instagram → external, new tab
```

### Supporting public flows

```text
/features
├── View Pricing / Compare Plans / premium upgrade link → /pricing
├── Learn more about Safety → /safety
└── Footer public links

/pricing
├── View all FAQs → /faq
└── Footer public links

/faq
├── Contact Support → /contact
├── Visit Help Center → /help
└── Footer public links

/contact
├── Email Us → mailto:support@crush.app
├── Live Chat → /help
├── Help Center → /faq
├── Safety links → /safety
├── Privacy link → /privacy
└── External social profiles

/guidelines
├── Safety Center → /safety
└── Report a Concern → /help

/privacy and /terms
├── Related legal document
└── Safety Guidelines → /help#safety
```

### Important route behavior

- `Download` is not a standalone page. The valid destination is the `download`
  section on the home page: `/#download`.
- The Contact page footer incorrectly links to `/download`, which is not an
  implemented route and opens the 404 page.
- Privacy and Terms use a `Back to Settings` link, which does not return a public
  visitor to the public marketing site.

---

## Global Visual System

### Brand

- Brand name: `Crush`
- Tagline: `Find Your Perfect Match`
- Canonical brand primary in `brand.ts`: `#FF3F7F`
- Canonical dark background: `#0D0E12`
- Brand mark: filled heart
- Main gradient usage: primary pink to secondary purple

Important implementation detail:

- The canonical brand constant is `#FF3F7F`.
- The rendered CSS primary token is `hsl(340 82% 46%)`.
- These are not the same exact color, so different assets and UI surfaces may
  appear visually inconsistent.

### Typography

- Main font: Inter
- Monospace font available: JetBrains Mono
- Body text is generally compact and neutral.
- Landing headings use:
  - `3xl` on mobile
  - `4xl` on small screens
  - `5xl` on medium and larger screens
- Section headings generally use `2xl` to `3xl`.
- Supporting copy is usually `text-sm`, `text-base`, or `text-lg`.
- Marketing emphasis frequently uses `.text-gradient`.

### Color behavior

Light mode:

- White page background
- Near-black foreground
- White cards
- Light gray muted sections
- Pink accent surfaces

Dark mode:

- Near-black page background
- Off-white foreground
- Dark cards
- Dark gray muted sections
- Pink remains the primary accent

Semantic colors:

- Success: green
- Warning: amber/yellow
- Destructive: red
- Information: blue
- Premium accents: pink, purple, amber, and orange depending on page

### Shape and depth

- Buttons usually use `rounded-lg` or `rounded-xl`.
- Marketing cards usually use `rounded-xl` or `rounded-2xl`.
- Cards have thin borders and subtle shadows.
- The fixed public header uses a glass effect:
  - Translucent background
  - `12px` backdrop blur
  - Low-opacity border
- Hover behavior is restrained:
  - Text changes from muted to foreground
  - Card borders move toward primary
  - Buttons darken or change background

### Motion

- Global smooth scrolling is enabled.
- The phone mockup has one pulsing floating match card.
- Theme icons rotate and scale when changing modes.
- Accordion chevrons rotate when expanded.
- Most transitions are short color, opacity, or transform transitions.
- There is no comprehensive `prefers-reduced-motion` styling override in the
  marketing implementation.

### Icons and imagery

- Icons are primarily Lucide line icons.
- The home page contains no real user photography or real product screenshots.
- The phone visual in Download is a CSS-built mockup with a heart logo and text.
- Testimonials have no avatars or photos.
- The current visual feel is therefore more product-documentation-like than
  emotionally immersive or lifestyle-oriented.

---

## Global Public UX

### Marketing wrapper

All pages in the marketing route group are wrapped in:

```html
<main id="main-content">...</main>
```

The root layout provides a keyboard skip link to this main content.

### Theme

- Theme defaults to the visitor's system theme.
- Theme choice can be persisted.
- The fixed public header exposes a compact light/dark icon toggle on the pages
  that implement that header.
- Pages without the fixed public header still inherit the global theme but do
  not expose a visible theme control.

### Cookie consent

- Appears globally one second after first visit if no choice has been stored.
- Fixed to the bottom of the viewport.
- Presented as a card with explanatory copy and a Privacy Policy link.
- Controls:
  - `Decline`
  - `Accept`
- Either action stores a local value and dismisses the banner.
- It does not expose granular cookie categories or a way to reopen preferences.
- The current Accept and Decline actions only store the selection and dismiss
  the UI. The global analytics provider remains mounted in either case.

### Responsive behavior

Breakpoints:

- `xs`: 475px
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

Common behavior:

- Sections use horizontal padding of `16px`, increasing at larger breakpoints.
- Content is usually constrained between `max-w-3xl` and `max-w-7xl`.
- Multi-column cards collapse to one column on narrow screens.
- Primary/secondary button groups become stacked on narrow screens.
- The footer changes from four columns to a two-column grid on narrow screens.
- Pricing comparison is horizontally scrollable.

Important mobile behavior:

- The center links in the fixed public header are hidden below `md`.
- There is no real mobile navigation drawer or hamburger menu for the public
  pages.
- On narrow screens, visitors must use the footer to reach most public pages.

### Accessibility characteristics

Implemented:

- Global visible focus outline
- Skip link
- Semantic `main`, `nav`, headings, buttons, links, and form labels in many areas
- Accessible labels on external social icon links
- Download platform badges have descriptive `aria-label` values
- Contact form fields have visible labels

Gaps:

- FAQ and pricing accordions do not expose `aria-expanded` or `aria-controls`.
- FAQ category buttons do not expose a selected tab state.
- Pricing billing-period controls do not expose a radio/tab state.
- FAQ search relies on placeholder text and has no visible or screen-reader-only
  label.
- Emergency phone numbers on Safety are plain text rather than `tel:` links.
- Public mobile navigation is missing.
- Some isolated pages use hard-coded gray colors rather than semantic design
  tokens, reducing consistency across themes.

---

## Shared Public Header

Present on:

- Home
- Features
- Pricing
- Contact
- FAQ

Not present on:

- About
- Help
- Privacy
- Terms
- Safety
- Guidelines

### Header attributes

- Fixed to top
- Full viewport width
- Height: `56px`
- Z-index: `50`
- Glass background
- Bottom border
- Inner max width: `7xl`

### Left zone

- Filled pink heart icon
- Gradient `Crush` wordmark
- Clicking it returns to `/`

### Center zone

Visible at `md` and above:

- Features
- Pricing
- About
- Safety

Current-page styling is manually applied on Features and Pricing. Other pages do
not consistently show an active public-nav state.

### Right zone

- Theme toggle
- Additional account-entry controls exist but are outside this handoff

---

## Shared Public Footer Pattern

The full footer is present on Home, Features, Pricing, Contact, and FAQ.

### Footer layout

- Top border
- `48px` vertical padding
- Four-column layout on medium screens and above
- Two-column layout on narrow screens

### Brand column

- Heart mark and gradient Crush wordmark
- Short statement:
  - `Find meaningful connections with people who share your interests.`

### Product column

- Features
- Pricing
- Download

### Company column

- About
- Contact
- FAQ

### Legal column

- Privacy Policy
- Terms of Service
- Safety
- Guidelines appears only in the home-page footer, not in the other repeated
  footer implementations.

### Footer bottom row

- Current-year copyright
- Home and Features include Twitter and Instagram icon links.
- Pricing, Contact, and FAQ omit the footer social links.

The footer is duplicated across page files instead of being a shared component.
This is why link sets and social controls differ between pages.

---

## Main Landing Page: `/`

### Overall structure

```text
Fixed Header
Hero
Social Proof
Why Choose Crush
How Crush Works
Testimonials
Pricing Preview
Download
Conversion Panel
Footer
```

The account-focused conversion controls are outside this handoff, but the
surrounding conversion panels affect page rhythm and visual density.

### 1. Hero

Layout:

- Top padding leaves room for the fixed header.
- Centered content constrained to `max-w-3xl`.
- Large whitespace around the headline.

Elements:

- Accent pill:
  - Sparkles icon
  - `Over 1 million matches made`
- Main headline:
  - `Find your perfect match`
  - `perfect match` uses the pink-to-purple gradient
- Supporting paragraph:
  - Focuses on meaningful connections, shared interests, and values
- Public secondary action:
  - `Learn More`
  - Routes to `/features`

UX role:

- Establishes product promise
- Uses a restrained SaaS-style presentation rather than visual dating imagery
- Moves curious visitors into the full Features page through `Learn More`

### 2. Social Proof

Placed directly below the hero actions with a top border.

Three centered metrics:

- `4.8` with five filled warning-color stars and `App Store`
- `1M+` downloads
- `50K+` daily matches

Vertical dividers separate the metrics.

### 3. Why Choose Crush

Background:

- Light muted section, `bg-muted/30`

Heading:

- `Why Choose Crush?`

Supporting line:

- Every feature is designed to help users find meaningful connections.

Six cards in a three-column desktop grid:

1. Smart Matching
2. Meaningful Conversations
3. Safe & Secure
4. See Who Likes You
5. Undo Swipes
6. Passport Mode

Card style:

- Rounded
- Thin border
- White/dark semantic card background
- Small accent icon tile
- Title and short description
- No click behavior

### 4. How Crush Works

Heading:

- `How Crush Works`

Supporting line:

- Positions the journey as three simple steps.

Three centered step cards:

1. Create Your Profile
2. Discover Matches
3. Start Chatting

Each step has:

- Large accent icon tile
- Small circular numbered badge overlapping the tile
- Title
- Description

These are informational and not interactive.

### 5. Testimonials

Background:

- Muted section

Heading:

- `Love Stories From Crush`

Three testimonial cards:

- Sarah M., New York
- Michael T., Los Angeles
- Emily R., Chicago

Each card contains:

- Five filled stars
- Italic quote
- Name
- Location

There are no photos, verification details, carousel behavior, or links.

### 6. Pricing Preview

Heading:

- `Simple, Transparent Pricing`

Two cards:

#### Free

- `$0`
- `Everything you need to get started`
- Unlimited swipes
- See who you matched with
- Send messages
- Basic discovery filters

#### Crush+

- `$9.99/month`
- `Unlock premium features`
- Everything in Free
- See who likes you
- Unlimited rewinds
- Super likes
- Advanced filters
- Read receipts
- Marked `Most Popular`
- Primary-border emphasis

This home preview does not show Platinum, quarterly pricing, yearly pricing, or
the full feature comparison.

### 7. Download: `/#download`

This is the only implemented Download destination.

Layout:

- Muted background
- Two columns on large screens
- Copy and platform badges on the left
- CSS phone mockup on the right

Content:

- Accent pill: `Available on all platforms`
- Heading: `Get Crush on Your Phone`
- Copy says the app is available free on iOS and Android

Platform controls:

- App Store badge
- Google Play badge
- Both display `Coming Soon on`
- Both are non-interactive `<span>` elements
- Cursor is default
- They do not open a store or any follow-on flow

Trust indicators:

- Free to download
- No ads
- Secure

Phone mockup:

- Tall rounded device frame
- Pink gradient interior
- Heart logo
- `Crush`
- `Find your perfect match`
- Floating `New Match!` card with pulse animation
- Floating example message card

UX contradiction:

- The section says `Available on all platforms` and that the app is available on
  iOS and Android.
- Both platform badges say `Coming Soon` and cannot be clicked.

### 8. Footer

The home footer is the most complete footer implementation:

- Product: Features, Pricing, Download
- Company: About, Contact, FAQ
- Legal: Privacy, Terms, Safety, Guidelines
- Twitter and Instagram

---

## Learn More Flow

The landing hero's `Learn More` button routes to `/features`.

Behavior:

- Standard link navigation
- Outline button style
- No modal, video, inline expansion, or guided tour
- The Features page becomes the detailed continuation of the landing story

Recommended interpretation for redesign work:

- Treat Home and Features as one narrative.
- Home should establish emotion and high-level differentiation.
- Features should provide evidence and product depth.

---

## Product: Features `/features`

### Page structure

```text
Fixed Header
Features Hero
Core Features
Premium Features
Safety and Security
Communication Features
Discovery Features
Conversion Panel
Footer
```

### Features hero

- Accent pill: `Powerful features for meaningful connections`
- Heading: `Everything You Need to Find Your Match`
- Description covering smart matching and secure messaging
- Public action: `View Pricing` → `/pricing`

### Core Features

Six cards:

1. Smart Matching Algorithm
   - Has `AI Powered` badge
2. Advanced Discovery Filters
3. Rich Messaging
4. Profile Prompts
5. Location-Based Discovery
6. Smart Notifications

Cards are informational and do not open detail views.

### Premium Features

Six pink-gradient cards:

1. See Who Likes You
2. Unlimited Rewinds
3. Super Likes
4. Passport Mode
5. Priority Boost
6. Incognito Mode

Public action:

- Premium upgrade link → `/pricing`

### Safety and Security

Two-column layout:

Left:

- Safety badge
- Trust-focused heading and copy
- Photo Verification
- AI-Powered Moderation
- Easy Blocking & Reporting
- Data Privacy
- `Learn more about Safety` → `/safety`

Right:

- Static visual card containing:
  - Verified Profile
  - Content Reviewed
  - Date Check-In

### Communication Features

Four centered cards:

1. Text Chat
2. Voice Notes
3. Video Chat
4. Virtual Gifts

No cards are clickable.

### Discovery Features

Two large cards:

#### Compatibility Quiz

- 10 questions, 2 minutes
- 5 personality types
- Compatibility scores
- Personalized suggestions

#### Smart Recommendations

- AI-powered suggestions
- Swipe-pattern learning
- Mutual interests
- Real-time updates

No links open the actual quiz or a demo from this public page.

### Features-page visual behavior

- Alternates white and muted sections.
- Uses multiple card styles to distinguish core, premium, communication, safety,
  and discovery groups.
- Uses no real product screenshots.
- Footer does not include Guidelines.

---

## Product: Pricing `/pricing`

### Page structure

```text
Fixed Header
Pricing Hero and Billing Toggle
Plan Cards
Feature Comparison
Premium Benefits
Pricing FAQ
Conversion Panel
Footer
```

### Pricing hero

- Accent pill: `Simple, transparent pricing`
- Heading: `Choose Your Perfect Plan`
- Description: start free, upgrade later, no hidden fees, cancel anytime

### Billing-period control

Three pill buttons:

- Monthly
- Quarterly
- Yearly

Behavior:

- Monthly is selected initially.
- Clicking a period updates every plan card immediately.
- Selected period receives white/dark background and shadow.
- Yearly has a visible `-33%` badge.

Current accessibility/state issue:

- The control visually acts like tabs or radio buttons but exposes no selected
  state semantics.

### Plans and prices

| Plan | Monthly | Quarterly | Yearly |
| --- | ---: | ---: | ---: |
| Free | $0 | $0 | $0 |
| Crush+ | $9.99 | $24.99 | $79.99 |
| Crush Platinum | $19.99 | $49.99 | $149.99 |

Calculated monthly equivalents:

| Plan | Quarterly equivalent | Yearly equivalent |
| --- | ---: | ---: |
| Crush+ | $8.33/month | $6.67/month |
| Crush Platinum | $16.66/month | $12.50/month |

Calculated savings:

| Plan | Quarterly | Yearly |
| --- | ---: | ---: |
| Crush+ | 17% | 33% |
| Crush Platinum | 17% | 37% |

The Yearly toggle badge always displays `-33%`, even though Platinum calculates
to 37%.

### Plan-card style

- Three-column desktop grid
- Rounded `2xl` cards
- Crush+ is marked `Most Popular`
- Crush+ receives:
  - Primary border
  - Larger shadow
  - `scale-105`
- Each card shows only the first eight configured feature rows.
- Included features use green checks.
- Excluded features use muted X icons.
- Plan conversion controls are outside this handoff.

### Feature comparison

Horizontally scrollable table with four columns:

- Feature
- Free
- Crush+
- Platinum

Rows:

1. Unlimited swipes
2. See your matches
3. Send messages
4. Discovery filters
5. See who likes you
6. Rewinds
7. Super likes
8. Passport mode
9. Profile boosts
10. Incognito mode
11. Read receipts
12. Priority support

The Crush+ comparison column uses a light primary tint.

### Why Go Premium

Four centered benefit blocks:

1. 3x More Matches
2. 10x More Views
3. Global Access
4. Full Control

These are informational and not interactive.

### Pricing FAQ

Six independent accordions:

1. Can I cancel my subscription anytime?
2. What payment methods do you accept?
3. Will my subscription auto-renew?
4. Can I switch between plans?
5. Is there a free trial?
6. Do you offer refunds?

Behavior:

- Multiple items can be opened.
- Chevron rotates.
- `View all FAQs` routes to `/faq`.

---

## Product: Download `/#download`

Download is an in-page anchor, not a separate route.

### Entry points

- Home footer Download link
- Features footer Download link
- Pricing footer Download link
- FAQ footer Download link

### Behavior

- Browser navigates to `/` and scrolls to the element with `id="download"`.
- Global smooth scrolling applies when already on a compatible page.
- Platform badges are visual only.

### Current problems

- Contact footer points to the invalid `/download` route.
- Store badges cannot be activated.
- Copy says the product is available while badges say it is coming soon.
- There are no QR codes, waitlist controls, email capture, release date, or
  platform-specific detail.

---

## Company: About `/about`

### Layout status

- Does not use the shared fixed public header.
- Does not use the shared public footer.
- Uses hard-coded white, gray, and dark-gray page colors.

### Page structure

1. Pink-to-purple hero
2. Stats strip
3. Our Story
4. Our Mission
5. Our Values
6. Award-Winning App
7. Bottom conversion banner

### Hero

- Gradient background
- White centered copy
- Heading: `Finding Love, Made Simple`
- Positions Crush as a community for meaningful connections

### Stats

- `10M+` Users Worldwide
- `50K+` Daily Matches
- `4.8` App Store Rating
- `150+` Countries

### Our Story and Mission

- Story explains the desire to move away from endless swiping.
- Mission card uses a Globe icon and emphasizes genuine connections,
  compatibility, thoughtful design, and smart technology.

### Values

Four cards:

1. Authentic Connections
2. Safety First
3. Inclusive Community
4. Quality Over Quantity

### Awards

Static award badges:

- Best New App 2024
- Editor's Choice
- Top Dating App

No source or external validation links are provided.

### Content consistency issue

- Home shows `1M+` downloads.
- About shows `10M+` users worldwide.
- Both show `50K+` daily matches and `4.8` App Store rating.
- Download badges on Home still say `Coming Soon`.

---

## Company: Contact `/contact`

### Page structure

```text
Fixed Header
Contact Hero
Contact Option Cards
Contact Form + Information Sidebar
Footer
```

### Contact hero

- Heading: `Get in Touch`
- Supporting copy promises team support.

### Contact option cards

1. Email Us
   - `support@crush.app`
   - Opens visitor's email client
2. Live Chat
   - `Available in-app`
   - Routes to `/help`, not a live-chat interface
3. Help Center
   - Routes to `/faq`
4. Response Time
   - `Within 24 hours`
   - Non-interactive

### Contact form

Fields:

- Your Name, required
- Email Address, required
- What can we help you with?, select
- Subject, required
- Message, required, five visible rows

Reason options:

- General Inquiry
- Technical Support
- Billing Question
- Partnership
- Press & Media
- Safety Concern

Submit behavior:

1. Browser-native required-field validation runs.
2. Button enters disabled loading state.
3. Spinner and `Sending...` appear.
4. A `1.5s` artificial delay runs.
5. Success state appears.

Important:

- The form does not send data to a server.
- The success state is simulated.

Success state:

- Green check icon
- `Message Sent!`
- Promise of a response within 24 hours
- `Send Another Message` resets the form

### Contact sidebar

Quick Links:

- FAQ
- Help Center
- Safety & Trust
- Privacy Policy

Office information:

- 123 Tech Boulevard, San Francisco, CA 94105, United States
- `hello@crush.app`
- Mon-Fri, 9am-6pm PST

Social icon links:

- Twitter
- Instagram
- YouTube
- TikTok

Safety notice:

- Red-tinted warning card
- `Report a safety concern` routes to `/safety`

### Contact-page issues

- `Live Chat` does not open live chat.
- Form submission is simulated.
- Footer Download link is broken.
- Office and response-time information should be verified before treating it as
  production content.

---

## Company: FAQ `/faq`

### Page structure

```text
Fixed Header
FAQ Hero and Search
Category Filters
FAQ List
Support Panel
Popular Topics
Footer
```

### Search

- Rounded pill input
- Search icon
- Placeholder: `Search questions...`
- Filters against both question and answer text
- Case-insensitive
- Results update immediately while typing

### Category filters

Eight pill buttons:

1. All Questions
2. Getting Started
3. Account
4. Matching
5. Messaging
6. Premium
7. Safety
8. Billing

The active category uses the primary background.

### FAQ list

- 31 total questions
- Each item is an accordion card
- Clicking the question toggles the answer
- Multiple items can remain open
- Chevron rotates on open

### Empty state

Shown when search/category combination has no results:

- Help icon
- `No questions found`
- Guidance copy
- `Clear filters` resets query and category

### Support panel

- `Contact Support` → `/contact`
- `Visit Help Center` → `/help`

### Popular Topics

Six clickable cards:

- Getting Started
- Matching Tips
- Safety & Privacy
- Premium Features
- Billing & Payments
- Account Settings

Behavior:

- Clicking a topic changes the active category.
- It does not scroll the visitor back to the filtered FAQ list.
- Because Popular Topics is below the list, the visible result of clicking may
  not be obvious until the visitor scrolls upward.

### FAQ state issue

Expanded items are tracked by their index in the currently filtered results.
Changing the search query or category can cause an expanded index to refer to a
different question.

### FAQ SEO

- The route includes FAQPage structured data.
- Only five selected FAQ questions are included in structured data, not all 31.

### FAQ question inventory

Getting Started:

- Is Crush free to use?
- What age do I need to be to use Crush?
- How do I set up my profile?

Account:

- How do I change my email or phone number?
- How do I delete my account?
- Can I pause my account?

Matching:

- How does matching work?
- Can I undo a swipe?
- What is a Super Like?
- Why am I not getting any matches?
- How do I unmatch someone?

Messaging:

- How do I start a conversation?
- Can I send photos in chat?
- What are voice notes?
- Can I video chat on Crush?

Premium:

- What features do I get with Crush+?
- What features do I get with Crush Platinum?
- How do I upgrade to premium?
- Can I cancel my subscription?
- What is Incognito Mode?

Safety:

- How do I report someone?
- How do I block someone?
- What is photo verification?
- How does Crush keep me safe?
- What should I do if I feel unsafe?

Billing:

- What payment methods do you accept?
- Will my subscription auto-renew?
- How do I get a refund?
- Why was I charged twice?

---

## Supporting Company Route: Help `/help`

The Help Center is publicly reachable even though it is not listed in the main
footer columns.

### Layout status

- No shared fixed public header
- No shared public footer
- Uses a gradient hero and card grid

### Categories

Six two-column accordion cards:

1. Matches & Discovery
2. Messages & Chat
3. Account & Profile
4. Safety & Privacy
5. Premium & Payments
6. Troubleshooting

Each category contains four expandable questions.

Question subjects:

- Getting more matches, missing profiles, Super Likes, and rewinds
- Sending messages, read receipts, unsending, and reporting conversations
- Editing profiles, changing contact details, and deleting accounts
- Blocking, reporting, dating-safety tips, and data protection
- Premium inclusions, cancellation, refunds, and declined payments
- Slow performance, photo uploads, and location problems

Questions that deal only with excluded account-entry behavior are intentionally
not itemized in this handoff.

### Controls

- Question row toggles its answer.
- Chevron rotates 90 degrees.
- `Contact Support` opens `mailto:support@crush.app`.

### Safety anchor

- Safety & Privacy has `id="safety"`.
- Privacy and Terms link to `/help#safety`.

---

## Legal: Privacy Policy `/privacy`

### Layout status

- No shared public header
- No shared public footer
- Narrow `max-w-3xl` document layout
- Uses hard-coded white/gray colors
- `Last updated: January 2026`

### Top control

- `Back to Settings`
- This is not a public-marketing return path.

### Sections

1. Your Privacy Matters
2. Information We Collect
3. How We Use Your Information
4. Information Sharing
5. Data Retention
6. Your Rights and Choices
7. Data Security
8. Children's Privacy
9. International Data Transfers
10. California Privacy Rights
11. European Privacy Rights
12. Cookies and Tracking Technologies
13. Changes to This Policy
14. Contact Us

### Links

- `privacy@crush.app`
- Terms of Service → `/terms`
- Safety Guidelines → `/help#safety`

### UX characteristics

- Long scroll with no table of contents.
- No sticky document navigation.
- No section-anchor links.
- No print/download control.
- No footer route back into the public site.

---

## Legal: Terms of Service `/terms`

### Layout status

- Same isolated legal-document style as Privacy
- `Last updated: January 2026`
- No shared public header or footer

### Top control

- `Back to Settings`

### Sections

1. Eligibility
2. Account Registration
3. Community Guidelines
4. Content Ownership
5. Subscriptions and Payments
6. Safety and Interactions
7. Disclaimer of Warranties
8. Limitation of Liability
9. Indemnification
10. Termination
11. Dispute Resolution
12. Governing Law
13. Changes to Terms
14. Severability
15. Entire Agreement
16. Contact Us
17. Final acknowledgment panel

### Links

- Safety tips → `/help#safety`
- `legal@crush.app`
- Privacy Policy → `/privacy`
- Safety Guidelines → `/help#safety`

### UX characteristics

- Long document without a table of contents or section navigation.
- Important uppercase legal passages have smaller text.
- No public-site footer or public return control.

---

## Legal and Trust: Safety `/safety`

### Layout status

- No shared public header
- No shared public footer
- Uses semantic design tokens more consistently than Privacy/Terms

### Page structure

1. Hero
2. Built-In Safety Features
3. Dating Safety Tips
4. Emergency Resources
5. Bottom conversion panel

### Hero

- Large Shield icon tile
- Heading: `Your Safety Comes First`
- Copy emphasizes safe and respectful community tools

### Built-In Safety Features

Six cards:

1. Photo Verification
2. AI Content Moderation
3. Block & Report
4. End-to-End Encryption
5. Date Safety Plans
6. Safety Alerts

These are product claims, not interactive demos.

### Dating Safety Tips

Six numbered cards:

1. Chat First
2. Meet in Public
3. Tell Someone
4. Arrange Your Own Transport
5. Stay Sober
6. Trust Your Gut

### Emergency Resources

Three cards:

- Emergency: 911
- Domestic Violence: 1-800-799-7233
- Sexual Assault: 1-800-656-4673

The phone numbers are plain text and cannot be tapped to call.

### Trust-claim review need

Claims such as end-to-end encryption, 24/7 review, AI moderation, and proactive
safety alerts should be verified against actual product behavior before a visual
redesign gives them greater prominence.

---

## Legal and Trust: Community Guidelines `/guidelines`

### Layout status

- No shared public header
- No shared public footer

### Page structure

1. Hero
2. Do and Don't cards
3. Content Standards
4. Enforcement

### Hero

- Users icon tile
- Heading: `Community Guidelines`
- Copy emphasizes respect, authenticity, and safety

### Do and Don't cards

`Do` card:

- Be respectful and kind
- Use recent, accurate photos
- Report uncomfortable behavior
- Communicate intentions honestly
- Respect boundaries
- Verify the profile to build trust
- Green check icons

`Don't` card:

- Harass, bully, or intimidate
- Share explicit content without consent
- Create fake profiles or impersonate others
- Spam, solicit, or promote commercial content
- Share other users' personal information
- Use hate speech or discriminatory language
- Red X icons

### Content Standards

Three cards:

- Photos
- Messages
- Profile Information

### Enforcement

- Warning icon
- Explains warnings, temporary suspensions, and permanent bans
- `Safety Center` → `/safety`
- `Report a Concern` → `/help`

---

## Public Content and Trust Issues to Resolve Before Redesign

These are not only copy concerns. They influence hierarchy, credibility, and the
overall feel of the public experience.

### Conflicting availability

- Home says `Available on all platforms`.
- Home copy says the app is available on iOS and Android.
- Both store badges say `Coming Soon`.
- Store badges are non-interactive.

### Conflicting scale and proof

- Home: `Over 1 million matches made`
- Home: `1M+ Downloads`
- Home: `50K+ Matches Daily`
- About: `10M+ Users Worldwide`
- About: `50K+ Daily Matches`
- About: `4.8 App Store Rating`
- About: `150+ Countries`
- About: static award claims

These claims have no visible source links and should be verified before being
used as central proof.

### Pricing and policy consistency

- Home preview shows Free and Crush+ only.
- Full Pricing includes Free, Crush+, and Platinum.
- Pricing and FAQ state a seven-day money-back guarantee.
- Terms describes refunds as subject to app-store policies and says there are no
  partial-period refunds.
- Yearly pricing badge says `-33%`, while Platinum calculates to 37%.

### Navigation inconsistency

- Only five public pages use the fixed header and full footer.
- Guidelines is missing from most footer Legal columns.
- Help is reachable but not listed in the footer.
- Privacy and Terms route back to Settings instead of the public site.
- Contact has a broken `/download` link.
- There is no public mobile navigation menu.

### Interaction authenticity

- Contact form displays success without sending a request.
- Live Chat routes to Help rather than opening a chat.
- Download badges are visual only.
- Most feature cards have no detail, preview, demo, or supporting evidence.

### Visual consistency

- Some pages use semantic design tokens.
- About, Help, Privacy, and Terms use separate hard-coded white/gray palettes.
- Header and footer are duplicated rather than shared.
- Theme controls are present only on pages with the fixed header.
- Marketing copy is hard-coded in English despite a global localization
  foundation.

---

## SEO, Sharing, and Public Discoverability

### Global metadata

- Default title: `Crush - Find Your Match`
- Title template: `%s | Crush`
- Global description positions Crush as a modern dating app for meaningful
  connections.
- Open Graph and Twitter metadata are configured.
- Public brand sharing image uses:
  - `#0D0E12` background
  - Pink glow
  - Heart mark
  - Crush wordmark
  - `Find Your Perfect Match`

### Structured data

The root layout emits:

- Organization
- SoftwareApplication
- WebSite

FAQ emits:

- FAQPage with five selected questions

### Sitemap

Public entries include:

- Home
- Features
- Pricing
- About
- Contact
- FAQ
- Help
- Privacy
- Terms
- Safety
- Guidelines

Home has the highest sitemap priority. Features and Pricing are next.

### Robots behavior

- Public marketing and legal pages are indexable.
- Private app routes and API routes are disallowed.

### PWA/public assets

- Manifest name and short name: `Crush`
- Display mode: standalone
- Theme color: `#FF3F7F`
- Background color: `#0D0E12`
- Orientation: portrait
- Categories: social, lifestyle
- Favicon is a pink heart on a dark rounded square.

---

## Existing Public Test Coverage

### Marketing E2E

`apps/web/e2e/marketing.spec.ts` checks:

- Home loads and has a hero heading
- Features loads
- Pricing loads
- FAQ loads
- Contact loads
- A Features navigation link works
- Basic public SEO tags, robots, and sitemap exist

The mobile-menu test does not prove that a real public mobile menu exists. It
can select an unrelated icon button.

### Responsive E2E

`apps/web/e2e/responsive.spec.ts` checks Home for horizontal overflow at:

- 320px
- 375px
- 475px
- 640px
- 768px
- 1024px
- 1280px
- 1536px

It does not sweep every public destination page.

### Visual regression

Public visual snapshots currently cover:

- Home
- Pricing

Features, About, Contact, FAQ, Help, Privacy, Terms, Safety, and Guidelines do
not have public visual baselines.

### Accessibility E2E

Home receives basic checks for:

- Image alternative text
- Accessible button/link names
- Heading hierarchy
- Keyboard focus movement
- Focus visibility
- Landmark regions
- 200% zoom reflow

The tests do not currently validate the public FAQ accordion semantics, pricing
period semantics, emergency phone actions, or a real public mobile menu.

---

## Public Button and Interaction Inventory

Account-entry and plan-conversion controls are intentionally excluded.

| Location | Control | Result |
| --- | --- | --- |
| Header | Crush logo | Goes to `/` |
| Header | Features | Goes to `/features` |
| Header | Pricing | Goes to `/pricing` |
| Header | About | Goes to `/about` |
| Header | Safety | Goes to `/safety` |
| Header | Theme icon | Toggles light/dark theme |
| Home hero | Learn More | Goes to `/features` |
| Home Download | App Store badge | No action |
| Home Download | Google Play badge | No action |
| Footer | Download | Goes to `/#download`, except broken Contact footer link |
| Features hero | View Pricing | Goes to `/pricing` |
| Features premium | Premium upgrade link | Goes to `/pricing` |
| Features safety | Learn more about Safety | Goes to `/safety` |
| Features bottom panel | Compare Plans | Goes to `/pricing` |
| Pricing hero | Monthly | Updates all plan prices |
| Pricing hero | Quarterly | Updates all plan prices and savings |
| Pricing hero | Yearly | Updates all plan prices and savings |
| Pricing FAQ | Accordion question | Opens/closes answer |
| Pricing FAQ | View all FAQs | Goes to `/faq` |
| Contact cards | Email Us | Opens email client |
| Contact cards | Live Chat | Goes to `/help` |
| Contact cards | Help Center | Goes to `/faq` |
| Contact form | Send Message | Simulates loading and success |
| Contact success | Send Another Message | Resets form |
| Contact sidebar | Quick links | Go to FAQ, Help, Safety, or Privacy |
| Contact sidebar | Social icons | Open external sites in new tabs |
| FAQ hero | Search input | Filters questions and answers live |
| FAQ category pills | Category button | Filters FAQ list |
| FAQ list | Question row | Opens/closes answer |
| FAQ empty state | Clear filters | Resets search and category |
| FAQ support | Contact Support | Goes to `/contact` |
| FAQ support | Visit Help Center | Goes to `/help` |
| FAQ Popular Topics | Topic card | Changes active FAQ category |
| Help | Question row | Opens/closes answer |
| Help | Contact Support | Opens email client |
| Guidelines | Safety Center | Goes to `/safety` |
| Guidelines | Report a Concern | Goes to `/help` |
| Privacy | Related document links | Goes to Terms or Help safety anchor |
| Terms | Related document links | Goes to Privacy or Help safety anchor |
| Cookie banner | Privacy Policy | Goes to `/privacy` |
| Cookie banner | Decline | Stores decline choice and dismisses |
| Cookie banner | Accept | Stores accept choice and dismisses |

---

## Recommended Redesign Boundaries for Another Agent

### Preserve

- Existing public route paths
- `/#download` as the current canonical Download destination unless a new route
  is intentionally introduced
- Brand heart mark
- Primary brand direction
- Light/dark theme support
- Semantic page hierarchy
- Public SEO metadata and structured data
- Keyboard focus visibility
- Responsive behavior from 320px upward

### High-value structural work

1. Build one shared public header and footer.
2. Add a real public mobile navigation pattern.
3. Apply the shared public shell to About, Help, Privacy, Terms, Safety, and
   Guidelines.
4. Make Download availability and actions truthful and consistent.
5. Replace the broken `/download` link.
6. Decide whether the landing should remain minimal/SaaS-like or move toward a
   more emotional dating/lifestyle direction.
7. Add real product visuals or intentionally designed product illustrations.
8. Make proof points and trust claims verifiable.
9. Make Contact behavior real or clearly label it as unavailable.
10. Resolve FAQ interaction-state and accessibility issues.
11. Align pricing, refund, availability, and feature claims across all pages.
12. Use semantic tokens rather than page-specific hard-coded gray palettes.

### Landing-feel opportunities

- Stronger visual storytelling in the hero
- More emotionally relevant imagery
- Clearer distinction between product features and trust/safety evidence
- More compact or interactive feature explanation
- Real screenshots in place of static icon-only cards
- Better continuity between Home and Features
- Stronger public navigation on mobile
- More credible testimonials and social proof
- Cleaner, shared legal/trust presentation
- More intentional motion that respects reduced-motion preferences

---

## Acceptance Checklist for Landing/Marketing Changes

- Home still loads at `/`.
- `Learn More` still reaches `/features`.
- Product, Company, and Legal routes remain reachable without using account
  controls.
- Download links consistently reach a valid destination.
- Public navigation works at 320px, 375px, tablet, and desktop widths.
- No horizontal overflow at narrow widths.
- Header does not obscure anchored content.
- Theme remains usable on every public page.
- Footer link sets are consistent.
- Guidelines and Help are intentionally placed in the public information
  architecture.
- Contact form behavior is explicit and truthful.
- FAQ search, categories, accordions, and empty state remain usable by keyboard.
- Accordion controls expose expanded/collapsed state to assistive technology.
- Pricing-period controls expose selected state.
- Emergency phone numbers are actionable on mobile.
- Public claims are verified and consistent.
- Privacy and Terms provide a public return path.
- Cookie consent remains usable and does not cover essential controls.
- SEO titles, descriptions, canonical paths, sitemap entries, and structured
  data remain valid.
