'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  ArrowRight,
  Search,
  HelpCircle,
  CreditCard,
  Shield,
  User,
  MessageCircle,
  Settings,
  Sparkles
} from 'lucide-react';
import { ThemeToggle } from '@/shared/components/theme';

type FAQCategory = 'all' | 'getting-started' | 'account' | 'matching' | 'messaging' | 'premium' | 'safety' | 'billing';

const categories = [
  { id: 'all', label: 'All Questions', icon: HelpCircle },
  { id: 'getting-started', label: 'Getting Started', icon: Sparkles },
  { id: 'account', label: 'Account', icon: User },
  { id: 'matching', label: 'Matching', icon: Heart },
  { id: 'messaging', label: 'Messaging', icon: MessageCircle },
  { id: 'premium', label: 'Premium', icon: Settings },
  { id: 'safety', label: 'Safety', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

const faqs = [
  // Getting Started
  {
    category: 'getting-started',
    question: 'How do I create a Crush account?',
    answer: 'Creating a Crush account is easy! Download the app from the App Store or Google Play, or visit our website. You can sign up using your phone number, email address, or Apple/Google account. Follow the prompts to verify your identity, add photos, and complete your profile.',
  },
  {
    category: 'getting-started',
    question: 'Is Crush free to use?',
    answer: 'Yes! Crush is free to download and use. You can create a profile, swipe on potential matches, and chat with your matches without paying anything. We also offer premium subscriptions (Crush+ and Crush Platinum) that unlock additional features like seeing who likes you and unlimited rewinds.',
  },
  {
    category: 'getting-started',
    question: 'What age do I need to be to use Crush?',
    answer: 'You must be at least 18 years old to create a Crush account. We verify ages during sign-up and have systems in place to detect and remove underage users.',
  },
  {
    category: 'getting-started',
    question: 'How do I set up my profile?',
    answer: "Your profile is your first impression! Add at least 2 photos (we recommend 4-6), write a bio that shows your personality, and answer some profile prompts. The more complete your profile, the better your matches will be. You can always edit your profile later in Settings.",
  },

  // Account
  {
    category: 'account',
    question: 'How do I change my email or phone number?',
    answer: 'Go to Settings > Account > Contact Information. You can update your email address or phone number there. For security, you may need to verify your identity before making changes.',
  },
  {
    category: 'account',
    question: 'How do I delete my account?',
    answer: "We're sad to see you go! To delete your account, go to Settings > Account > Delete Account. This action is permanent and will delete all your matches, messages, and profile data. If you want to take a break instead, you can pause your account to hide your profile temporarily.",
  },
  {
    category: 'account',
    question: 'Can I pause my account?',
    answer: "Yes! If you want to take a break without losing your data, go to Settings > Account > Pause Account. Your profile will be hidden from discovery, but your existing matches and messages will be saved. You can unpause anytime.",
  },
  {
    category: 'account',
    question: 'How do I reset my password?',
    answer: 'On the login screen, tap "Forgot Password?" and enter your email address. We\'ll send you a link to reset your password. If you signed up with a phone number, you can request a verification code instead.',
  },

  // Matching
  {
    category: 'matching',
    question: 'How does matching work?',
    answer: "When you and another person both swipe right (like) on each other, it's a match! You'll both be notified and can start chatting. Our algorithm also learns from your preferences to show you more compatible profiles over time.",
  },
  {
    category: 'matching',
    question: 'Can I undo a swipe?',
    answer: 'Yes! If you accidentally swiped left on someone, you can use the Rewind feature to go back. Free users get 1 rewind per day, while Crush+ and Platinum subscribers get unlimited rewinds.',
  },
  {
    category: 'matching',
    question: 'What is a Super Like?',
    answer: 'A Super Like lets the other person know you\'re especially interested in them before they even swipe. When you Super Like someone, they\'ll see a blue star on your profile. Free users get 1 Super Like per week, Crush+ users get 5 per day, and Platinum users get unlimited Super Likes.',
  },
  {
    category: 'matching',
    question: 'Why am I not getting any matches?',
    answer: "There could be several reasons: your profile might need improvement (add more photos, write a better bio), your discovery settings might be too narrow, or you might be in a less populated area. Try expanding your distance and age preferences, and make sure your profile showcases your best self!",
  },
  {
    category: 'matching',
    question: 'How do I unmatch someone?',
    answer: 'Open the conversation with the person you want to unmatch, tap the "..." menu in the top right corner, and select "Unmatch." This will remove the match and delete your conversation. The other person won\'t be notified, but they won\'t be able to contact you anymore.',
  },

  // Messaging
  {
    category: 'messaging',
    question: 'How do I start a conversation?',
    answer: "Once you match with someone, tap on the match to open the chat. We recommend starting with something from their profile - comment on a photo, ask about an interest, or respond to one of their prompts. Avoid generic openers like \"Hey\" for better responses!",
  },
  {
    category: 'messaging',
    question: 'Can I send photos in chat?',
    answer: 'Yes! Tap the camera icon in the chat to send photos. For safety, all photos are scanned for inappropriate content. You can also send GIFs by tapping the GIF icon.',
  },
  {
    category: 'messaging',
    question: 'What are voice notes?',
    answer: 'Voice notes let you send short audio messages to your matches. Tap and hold the microphone icon to record. Voice notes can make conversations more personal and help you stand out!',
  },
  {
    category: 'messaging',
    question: 'Can I video chat on Crush?',
    answer: 'Yes! Once you\'ve been chatting for a bit, you can video call your matches directly in the app. Look for the video icon in the chat header. Video calls are a great way to get to know someone before meeting in person.',
  },

  // Premium
  {
    category: 'premium',
    question: 'What features do I get with Crush+?',
    answer: "Crush+ includes: See who likes you, unlimited rewinds, 5 Super Likes per day, Passport mode (match anywhere in the world), 1 profile boost per month, and no ads. It's our most popular subscription!",
  },
  {
    category: 'premium',
    question: 'What features do I get with Crush Platinum?',
    answer: 'Crush Platinum includes everything in Crush+, plus: unlimited Super Likes, 5 boosts per month, Incognito mode (browse privately), read receipts, advanced filters, and priority customer support.',
  },
  {
    category: 'premium',
    question: 'How do I upgrade to premium?',
    answer: 'Tap the crown icon in the app or go to Settings > Upgrade to Premium. Choose your plan (monthly, quarterly, or yearly) and complete payment. Your premium features will activate immediately.',
  },
  {
    category: 'premium',
    question: 'Can I cancel my subscription?',
    answer: "Yes, you can cancel anytime. Go to Settings > Manage Subscription to cancel. You'll keep your premium features until the end of your current billing period. We don't offer prorated refunds for cancellations.",
  },
  {
    category: 'premium',
    question: 'What is Incognito Mode?',
    answer: 'Incognito Mode (Platinum only) lets you browse profiles without appearing in their discovery feed. Your profile will only be visible to people you like. This gives you complete control over who can see you.',
  },

  // Safety
  {
    category: 'safety',
    question: 'How do I report someone?',
    answer: 'To report a user, go to their profile or your conversation with them, tap the "..." menu, and select "Report." Choose the reason for your report and provide any additional details. Our team reviews all reports and takes appropriate action.',
  },
  {
    category: 'safety',
    question: 'How do I block someone?',
    answer: 'To block a user, go to their profile or conversation, tap the "..." menu, and select "Block." Blocked users can\'t see your profile, match with you, or send you messages. You can unblock users in Settings if you change your mind.',
  },
  {
    category: 'safety',
    question: 'What is photo verification?',
    answer: 'Photo verification proves that your photos are really you. Take a selfie mimicking a random pose, and our team will compare it to your profile photos. Verified profiles get a blue checkmark badge, helping build trust with potential matches.',
  },
  {
    category: 'safety',
    question: 'How does Crush keep me safe?',
    answer: 'We use multiple safety measures: photo verification, AI-powered content moderation, 24/7 human review of reports, easy blocking and reporting tools, and optional features like Date Check-In. We also provide safety tips and resources in the app.',
  },
  {
    category: 'safety',
    question: 'What should I do if I feel unsafe?',
    answer: 'If you feel unsafe, immediately block and report the user. If you\'re in immediate danger, contact local emergency services. You can also reach out to our Safety Team through the app or at safety@crushapp.com for support.',
  },

  // Billing
  {
    category: 'billing',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, and Google Pay. Payment is securely processed through our payment partners.',
  },
  {
    category: 'billing',
    question: 'Will my subscription auto-renew?',
    answer: 'Yes, all subscriptions automatically renew at the end of each billing period to ensure uninterrupted access. You can turn off auto-renewal in your device\'s subscription settings or through your account settings.',
  },
  {
    category: 'billing',
    question: 'How do I get a refund?',
    answer: 'We offer a 7-day money-back guarantee for new subscribers. If you\'re not satisfied, contact support within 7 days of purchase for a full refund. After 7 days, refunds are handled on a case-by-case basis according to the policies of your app store.',
  },
  {
    category: 'billing',
    question: 'Why was I charged twice?',
    answer: 'Double charges are usually pending authorizations that will clear automatically. If you see two completed charges, please contact support with your payment details and we\'ll investigate and process a refund if needed.',
  },
];

export function FAQContent() {
  const [activeCategory, setActiveCategory] = useState<FAQCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-primary fill-primary" />
              <span className="text-lg font-semibold text-gradient">Crush</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="/safety" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Safety
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/auth/login" className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </Link>
              <Link href="/auth/signup" className="btn-primary text-sm">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-4">
              Frequently Asked <span className="text-gradient">Questions</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Find answers to common questions about Crush. Can't find what you're looking for?
              Contact our support team.
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-full border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id as FAQCategory)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === category.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No questions found</h3>
              <p className="text-muted-foreground mb-4">
                Try a different search term or category.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="btn-outline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium pr-4">{faq.question}</span>
                    <svg
                      className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${
                        openItems.has(index) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openItems.has(index) && (
                    <div className="px-6 pb-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Still Need Help Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
            <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold tracking-tight mb-3">
              Still Have Questions?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Can't find the answer you're looking for? Our friendly support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact" className="btn-primary">
                Contact Support
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/help" className="btn-outline">
                Visit Help Center
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Topics */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold tracking-tight mb-3">
              Popular <span className="text-gradient">Topics</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <TopicCard
              icon={<Sparkles className="w-5 h-5" />}
              title="Getting Started"
              description="Learn how to set up your profile and start matching"
              onClick={() => setActiveCategory('getting-started')}
            />
            <TopicCard
              icon={<Heart className="w-5 h-5" />}
              title="Matching Tips"
              description="Improve your chances of finding great matches"
              onClick={() => setActiveCategory('matching')}
            />
            <TopicCard
              icon={<Shield className="w-5 h-5" />}
              title="Safety & Privacy"
              description="Stay safe while dating online"
              onClick={() => setActiveCategory('safety')}
            />
            <TopicCard
              icon={<Settings className="w-5 h-5" />}
              title="Premium Features"
              description="Get the most out of your subscription"
              onClick={() => setActiveCategory('premium')}
            />
            <TopicCard
              icon={<CreditCard className="w-5 h-5" />}
              title="Billing & Payments"
              description="Manage your subscription and payments"
              onClick={() => setActiveCategory('billing')}
            />
            <TopicCard
              icon={<User className="w-5 h-5" />}
              title="Account Settings"
              description="Update your account and preferences"
              onClick={() => setActiveCategory('account')}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-primary fill-primary" />
                <span className="font-semibold text-gradient">Crush</span>
              </Link>
              <p className="text-xs text-muted-foreground">
                Find meaningful connections with people who share your interests.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Product</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/download" className="hover:text-foreground transition-colors">Download</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Company</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Legal</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="/safety" className="hover:text-foreground transition-colors">Safety</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Crush. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TopicCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors"
    >
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-accent-foreground mb-3">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
