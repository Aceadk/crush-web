'use client';

import { useRef, useState } from 'react';
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

import { faqs, type FAQCategory } from './faq-data';

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


export function FAQContent() {
  const [activeCategory, setActiveCategory] = useState<FAQCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Keyed by question text: tracking by filtered index made an expanded item
  // refer to a different question whenever the search/category filter changed.
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const faqListRef = useRef<HTMLDivElement>(null);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (question: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(question)) {
      newOpenItems.delete(question);
    } else {
      newOpenItems.add(question);
    }
    setOpenItems(newOpenItems);
  };

  const answerId = (question: string) =>
    `faq-answer-${question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

  // Popular Topics live below the list; scroll back up so the filter result
  // is visible after selecting a topic.
  const selectTopic = (category: FAQCategory) => {
    setActiveCategory(category);
    faqListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-background">

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
                aria-label="Search questions"
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
                  aria-pressed={activeCategory === category.id}
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
      <section ref={faqListRef} className="scroll-mt-20 py-8 px-4 sm:px-6 lg:px-8">
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
              {filteredFaqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-lg border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(faq.question)}
                    aria-expanded={openItems.has(faq.question)}
                    aria-controls={answerId(faq.question)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium pr-4">{faq.question}</span>
                    <svg
                      className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${
                        openItems.has(faq.question) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openItems.has(faq.question) && (
                    <div id={answerId(faq.question)} className="px-6 pb-4">
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
              onClick={() => selectTopic('getting-started')}
            />
            <TopicCard
              icon={<Heart className="w-5 h-5" />}
              title="Matching Tips"
              description="Improve your chances of finding great matches"
              onClick={() => selectTopic('matching')}
            />
            <TopicCard
              icon={<Shield className="w-5 h-5" />}
              title="Safety & Privacy"
              description="Stay safe while dating online"
              onClick={() => selectTopic('safety')}
            />
            <TopicCard
              icon={<Settings className="w-5 h-5" />}
              title="Premium Features"
              description="Get the most out of your subscription"
              onClick={() => selectTopic('premium')}
            />
            <TopicCard
              icon={<CreditCard className="w-5 h-5" />}
              title="Billing & Payments"
              description="Manage your subscription and payments"
              onClick={() => selectTopic('billing')}
            />
            <TopicCard
              icon={<User className="w-5 h-5" />}
              title="Account Settings"
              description="Update your account and preferences"
              onClick={() => selectTopic('account')}
            />
          </div>
        </div>
      </section>

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
