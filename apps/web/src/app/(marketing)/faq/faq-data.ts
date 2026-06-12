/**
 * FAQ data shared by the FAQ page UI (client) and the FAQPage structured
 * data (server) so schema.org markup always covers every question.
 */

export type FAQCategory = 'all' | 'getting-started' | 'account' | 'matching' | 'messaging' | 'premium' | 'safety' | 'billing';

export const faqs: { category: Exclude<FAQCategory, 'all'>; question: string; answer: string }[] = [
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
    answer: 'Yes — video calling is available in the Crush mobile app (iOS and Android). Once you\'ve been chatting for a bit, look for the video icon in the chat header to call your match. On the web app you can message your matches; for video calls, continue in the mobile app. Video calls are a great way to get to know someone before meeting in person.',
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
    answer: 'If you feel unsafe, immediately block and report the user. If you\'re in immediate danger, contact local emergency services. You can also reach out to our Safety Team through the app or at safety@crush.app for support.',
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
