import { Metadata } from 'next';
import Link from 'next/link';
import {
  MessageCircle,
  Shield,
  Heart,
  Settings,
  CreditCard,
  UserX,
  AlertTriangle,
  Mail,
  ChevronRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Help Center - Crush',
  description: 'Get help with your Crush account, matches, messages, and more.',
};

const helpCategories = [
  {
    icon: Heart,
    title: 'Matches & Discovery',
    description: 'Learn how matching works',
    items: [
      'How do I get more matches?',
      'Why am I not seeing new profiles?',
      'What is a Super Like?',
      'How do I undo a swipe?',
    ],
  },
  {
    icon: MessageCircle,
    title: 'Messages & Chat',
    description: 'Messaging tips and troubleshooting',
    items: [
      'Why can\'t I send messages?',
      'How do I know if someone read my message?',
      'Can I unsend a message?',
      'How do I report a conversation?',
    ],
  },
  {
    icon: Settings,
    title: 'Account & Profile',
    description: 'Manage your account settings',
    items: [
      'How do I edit my profile?',
      'How do I change my email or phone?',
      'How do I reset my password?',
      'How do I delete my account?',
    ],
  },
  {
    icon: Shield,
    title: 'Safety & Privacy',
    id: 'safety',
    description: 'Stay safe while dating',
    items: [
      'How do I block someone?',
      'How do I report a user?',
      'Tips for safe dating',
      'How is my data protected?',
    ],
  },
  {
    icon: CreditCard,
    title: 'Premium & Payments',
    description: 'Subscription and billing help',
    items: [
      'What\'s included in Premium?',
      'How do I cancel my subscription?',
      'How do I get a refund?',
      'Why was my payment declined?',
    ],
  },
  {
    icon: UserX,
    title: 'Troubleshooting',
    description: 'Common issues and fixes',
    items: [
      'App is running slowly',
      'I can\'t log in',
      'My photos won\'t upload',
      'Location isn\'t working',
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-secondary py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How can we help?
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Find answers to common questions or contact our support team.
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          {helpCategories.map((category) => (
            <div
              key={category.title}
              id={category.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <category.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {category.title}
                  </h2>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {category.items.map((item) => (
                  <li key={item}>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center justify-between group">
                      {item}
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Still need help?
          </h2>
          <p className="text-gray-500 mb-6">
            Our support team is here to help you with any questions.
          </p>
          <a
            href="mailto:support@crush.app"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-medium hover:bg-primary-dark transition-colors"
          >
            Contact Support
          </a>
        </div>

        {/* Safety Tips */}
        <div className="mt-8 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-100 dark:border-amber-800">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                Safety First
              </h3>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li>• Never send money to someone you haven&apos;t met</li>
                <li>• Meet in public places for first dates</li>
                <li>• Tell a friend where you&apos;re going</li>
                <li>• Report suspicious behavior immediately</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
