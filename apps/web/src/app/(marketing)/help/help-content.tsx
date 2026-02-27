'use client';

import { useState } from 'react';
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

type HelpItem = {
  question: string;
  answer: string;
};

type HelpCategory = {
  icon: typeof Heart;
  title: string;
  description: string;
  id?: string;
  items: HelpItem[];
};

const helpCategories: HelpCategory[] = [
  {
    icon: Heart,
    title: 'Matches & Discovery',
    description: 'Learn how matching works',
    items: [
      {
        question: 'How do I get more matches?',
        answer:
          'Complete your profile with at least 4–6 photos, write an engaging bio, and answer profile prompts. Keep your discovery filters reasonable — a wider age range and distance can help. The more active you are, the more our algorithm learns your preferences and shows you compatible profiles. Consider upgrading to Crush+ for features like Profile Boosts that put you in front of more people.',
      },
      {
        question: 'Why am I not seeing new profiles?',
        answer:
          'There could be a few reasons: your discovery filters might be too narrow (try expanding your age range or distance), you may have swiped through most profiles in your area, or you might be in a less populated area. Try adjusting your settings in Settings > Discovery & Filters. New profiles are added regularly, so check back often.',
      },
      {
        question: 'What is a Super Like?',
        answer:
          "A Super Like lets the other person know you're especially interested in them before they even swipe. When you Super Like someone, they'll see a blue star on your profile. Free users get 1 Super Like per week, Crush+ users get 5 per day, and Crush Platinum users get unlimited Super Likes.",
      },
      {
        question: 'How do I undo a swipe?',
        answer:
          'If you accidentally swiped left on someone, you can use the Rewind feature to go back and see their profile again. Free users get 1 rewind per day, while Crush+ and Platinum subscribers get unlimited rewinds. Tap the rewind button at the bottom of the discovery screen.',
      },
    ],
  },
  {
    icon: MessageCircle,
    title: 'Messages & Chat',
    description: 'Messaging tips and troubleshooting',
    items: [
      {
        question: "Why can't I send messages?",
        answer:
          "Messages are only available with mutual matches — both you and the other person need to have swiped right on each other. If you sent a message request, wait for them to accept. Make sure you have a stable internet connection and your app is up to date. If the issue persists, try logging out and back in.",
      },
      {
        question: 'How do I know if someone read my message?',
        answer:
          "Read receipts are available for Crush Platinum subscribers. When enabled, you'll see a small indicator below your message showing it has been read. You can manage read receipts in your chat settings. Note that if the other person has read receipts turned off, you won't see their read status.",
      },
      {
        question: 'Can I unsend a message?',
        answer:
          "Currently, you cannot unsend a message once it has been delivered. If you said something you regret, you can unmatch with the person, which will delete the entire conversation for both parties. We recommend taking a moment before sending to make sure you're happy with your message.",
      },
      {
        question: 'How do I report a conversation?',
        answer:
          "Open the conversation, tap the \"...\" menu in the top right corner, and select \"Report.\" Choose the reason that best describes the issue and provide any additional details. Our team reviews all reports within 24 hours and takes appropriate action. Reporting is anonymous — the other person won't know you reported them.",
      },
    ],
  },
  {
    icon: Settings,
    title: 'Account & Profile',
    description: 'Manage your account settings',
    items: [
      {
        question: 'How do I edit my profile?',
        answer:
          "Go to your profile by tapping your profile icon, then tap \"Edit Profile.\" You can update your photos, bio, profile prompts, and basic information. We recommend keeping your profile fresh with recent photos and updated interests. The more complete your profile, the better your match quality will be.",
      },
      {
        question: 'How do I change my email or phone?',
        answer:
          'Go to Settings > Account Security > Contact Information. You can update your email address or phone number there. For security, you may need to verify your identity by confirming a code sent to your current email or phone before making changes.',
      },
      {
        question: 'How do I reset my password?',
        answer:
          "On the login screen, tap \"Forgot Password?\" and enter your email address. We'll send you a link to reset your password. If you signed up with a phone number, you can request a verification code instead. For security, the reset link expires after 24 hours.",
      },
      {
        question: 'How do I delete my account?',
        answer:
          'Go to Settings > Account Actions > Delete Account. This action is permanent and will delete all your matches, messages, and profile data. If you want to take a break instead, consider pausing your account to hide your profile temporarily. We retain your data for 14 days after deletion in case you change your mind.',
      },
    ],
  },
  {
    icon: Shield,
    title: 'Safety & Privacy',
    id: 'safety',
    description: 'Stay safe while dating',
    items: [
      {
        question: 'How do I block someone?',
        answer:
          "Go to the person's profile or your conversation with them, tap the \"...\" menu, and select \"Block.\" Blocked users can't see your profile, match with you, or send you messages. You can manage blocked users in Settings > Safety & Blocking. You can unblock users later if you change your mind.",
      },
      {
        question: 'How do I report a user?',
        answer:
          'To report a user, go to their profile or your conversation with them, tap the "..." menu, and select "Report." Choose the reason for your report and provide any additional details. Our team reviews all reports and takes appropriate action. Reporting is completely anonymous.',
      },
      {
        question: 'Tips for safe dating',
        answer:
          "Always meet in public places for first dates and tell a friend where you're going. Arrange your own transportation. Keep conversations in the app until you're comfortable. Never send money or share financial details with someone you haven't met. Look for verified badges on profiles. Trust your instincts — if something feels off, report the user and move on.",
      },
      {
        question: 'How is my data protected?',
        answer:
          'We use industry-standard security measures including encryption of data in transit and at rest, secure authentication with phone/email verification, regular security audits, and strict access controls. We never sell your personal information. You can review our full data practices in our Privacy Policy, and you can request a copy of your data or request deletion at any time.',
      },
    ],
  },
  {
    icon: CreditCard,
    title: 'Premium & Payments',
    description: 'Subscription and billing help',
    items: [
      {
        question: "What's included in Premium?",
        answer:
          'Crush+ ($9.99/month) includes: see who likes you, unlimited rewinds, 5 Super Likes per day, Passport mode to match anywhere in the world, 1 Profile Boost per month, and no ads. Crush Platinum ($19.99/month) includes everything in Crush+ plus unlimited Super Likes, 5 Boosts per month, Incognito mode, read receipts, advanced filters, and priority support.',
      },
      {
        question: 'How do I cancel my subscription?',
        answer:
          "You can cancel your subscription at any time. Go to Settings > Manage Subscription, or manage it directly through the App Store (iOS) or Google Play Store (Android). You'll continue to have access to premium features until the end of your current billing period.",
      },
      {
        question: 'How do I get a refund?',
        answer:
          "We offer a 7-day money-back guarantee for new subscribers. If you're not satisfied, contact our support team within 7 days of your purchase for a full refund. After 7 days, refunds are handled on a case-by-case basis according to the policies of your app store (Apple App Store or Google Play).",
      },
      {
        question: 'Why was my payment declined?',
        answer:
          'Common reasons include: insufficient funds, an expired or incorrect card number, your bank blocking the transaction, or a billing address mismatch. Try updating your payment method in your device\'s subscription settings. If the problem persists, contact your bank or card issuer. You can also try a different payment method.',
      },
    ],
  },
  {
    icon: UserX,
    title: 'Troubleshooting',
    description: 'Common issues and fixes',
    items: [
      {
        question: 'App is running slowly',
        answer:
          'Try these steps: close and reopen the app, make sure you\'re on the latest version (check your app store for updates), clear the app cache in Settings > Data & Storage, ensure you have a stable internet connection, and restart your device. If the issue persists, try uninstalling and reinstalling the app.',
      },
      {
        question: "I can't log in",
        answer:
          'First, make sure you\'re using the correct email, phone number, or social login method you originally signed up with. Try resetting your password using the "Forgot Password?" option. Check that your internet connection is working. If your account was suspended, you\'ll see a notification explaining why. Contact support if you believe this was in error.',
      },
      {
        question: "My photos won't upload",
        answer:
          'Ensure your photos meet our requirements: JPG or PNG format, under 10 MB each, and at least 400×400 pixels. Check your internet connection — uploads need a stable connection. Make sure the app has permission to access your photo library (check device Settings > Privacy > Photos). Try uploading a different photo to rule out file corruption.',
      },
      {
        question: "Location isn't working",
        answer:
          'Make sure location services are enabled for the Crush app in your device settings (Settings > Privacy > Location Services on iOS, or Settings > Apps > Crush > Permissions on Android). Select "While Using the App" for best results. If location still isn\'t working, try toggling location services off and back on, or restart your device.',
      },
    ],
  },
];

export function HelpContent() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(key)) {
      newOpenItems.delete(key);
    } else {
      newOpenItems.add(key);
    }
    setOpenItems(newOpenItems);
  };

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
          {helpCategories.map((category, catIndex) => (
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
              <ul className="space-y-1">
                {category.items.map((item, itemIndex) => {
                  const key = `${catIndex}-${itemIndex}`;
                  const isOpen = openItems.has(key);
                  return (
                    <li key={key}>
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center justify-between group"
                      >
                        <span className="pr-2">{item.question}</span>
                        <ChevronRight
                          className={`w-4 h-4 text-gray-500 group-hover:text-primary flex-shrink-0 transition-transform duration-200 ${
                            isOpen ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed pl-0.5">
                            {item.answer}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
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
                <li>&bull; Never send money to someone you haven&apos;t met</li>
                <li>&bull; Meet in public places for first dates</li>
                <li>&bull; Tell a friend where you&apos;re going</li>
                <li>&bull; Report suspicious behavior immediately</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
