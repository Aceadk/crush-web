'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@crush/core';
import { Card, Button, Input, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  Shield,
  MapPin,
  Clock,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Users,
  Eye,
  Bell,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Heart,
  Info,
} from 'lucide-react';

interface SafetyTip {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const SAFETY_TIPS: SafetyTip[] = [
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Chat First',
    description: 'Get to know someone through messages before meeting in person. Trust your instincts.',
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Meet in Public',
    description: 'Always meet in a public place for your first few dates. Coffee shops, restaurants, or parks are great options.',
  },
  {
    icon: <Phone className="w-5 h-5" />,
    title: 'Tell Someone',
    description: 'Let a friend or family member know where you\'re going, who you\'re meeting, and when you expect to be back.',
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: 'Stay Local',
    description: 'For first dates, choose a location you\'re familiar with and can easily leave if needed.',
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: 'Watch Your Drink',
    description: 'Never leave your drink unattended and be cautious about accepting drinks from others.',
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: 'Trust Your Gut',
    description: 'If something feels off, it probably is. Don\'t hesitate to leave if you feel uncomfortable.',
  },
];

const EMERGENCY_CONTACTS = [
  { name: 'Emergency Services', number: '911', description: 'For immediate emergencies' },
  { name: 'National Domestic Violence Hotline', number: '1-800-799-7233', description: '24/7 support' },
  { name: 'RAINN Sexual Assault Hotline', number: '1-800-656-4673', description: '24/7 confidential support' },
];

export default function SafetyPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [trustedContacts, setTrustedContacts] = useState<string[]>([]);
  const [newContact, setNewContact] = useState('');
  const [shareLocationEnabled, setShareLocationEnabled] = useState(false);
  const [datePlan, setDatePlan] = useState({
    who: '',
    where: '',
    when: '',
    notes: '',
  });
  const [planShared, setPlanShared] = useState(false);
  const [copied, setCopied] = useState(false);

  const addTrustedContact = useCallback(() => {
    if (newContact.trim() && !trustedContacts.includes(newContact.trim())) {
      setTrustedContacts([...trustedContacts, newContact.trim()]);
      setNewContact('');
    }
  }, [newContact, trustedContacts]);

  const removeTrustedContact = useCallback((contact: string) => {
    setTrustedContacts(trustedContacts.filter(c => c !== contact));
  }, [trustedContacts]);

  const shareDatePlan = useCallback(() => {
    const planText = `Date Safety Check-in from ${profile?.displayName || 'Me'}:

Meeting: ${datePlan.who}
Location: ${datePlan.where}
Time: ${datePlan.when}
${datePlan.notes ? `Notes: ${datePlan.notes}` : ''}

I'll check in when I'm home safe!`;

    if (navigator.share) {
      navigator.share({
        title: 'Date Safety Check-in',
        text: planText,
      });
    } else {
      navigator.clipboard.writeText(planText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setPlanShared(true);
  }, [datePlan, profile?.displayName]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Date Safety
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Card */}
        <Card className="overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600">
          <div className="p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Your Safety Matters</h2>
                <p className="text-white/80 text-sm">Plan safe dates with confidence</p>
              </div>
            </div>
            <p className="text-white/90">
              Use these tools to share your plans with trusted contacts and stay safe while dating.
            </p>
          </div>
        </Card>

        {/* Date Plan Sharing */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Share Your Date Plan
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fill in your date details and share with a trusted contact.
            </p>

            <div className="space-y-3">
              <Input
                placeholder="Who are you meeting?"
                value={datePlan.who}
                onChange={(e) => setDatePlan({ ...datePlan, who: e.target.value })}
              />
              <Input
                placeholder="Where? (address or place name)"
                value={datePlan.where}
                onChange={(e) => setDatePlan({ ...datePlan, where: e.target.value })}
              />
              <Input
                placeholder="When? (date and time)"
                value={datePlan.when}
                onChange={(e) => setDatePlan({ ...datePlan, when: e.target.value })}
              />
              <Input
                placeholder="Any additional notes (optional)"
                value={datePlan.notes}
                onChange={(e) => setDatePlan({ ...datePlan, notes: e.target.value })}
              />
            </div>

            <Button
              className="w-full"
              onClick={shareDatePlan}
              disabled={!datePlan.who || !datePlan.where || !datePlan.when}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Date Plan
                </>
              )}
            </Button>

            {planShared && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Plan shared! Stay safe out there.</span>
              </div>
            )}
          </div>
        </Card>

        {/* Trusted Contacts */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4" />
              Trusted Contacts
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add contacts who you trust to share your date plans with.
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="Name or phone number"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTrustedContact()}
              />
              <Button onClick={addTrustedContact} disabled={!newContact.trim()}>
                Add
              </Button>
            </div>

            {trustedContacts.length > 0 ? (
              <div className="space-y-2">
                {trustedContacts.map((contact) => (
                  <div
                    key={contact}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="font-medium">{contact}</span>
                    </div>
                    <button
                      onClick={() => removeTrustedContact(contact)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No trusted contacts added yet
              </p>
            )}
          </div>
        </Card>

        {/* Safety Tips */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Info className="w-4 h-4" />
              Safety Tips
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {SAFETY_TIPS.map((tip, index) => (
              <div key={index} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 text-green-600 dark:text-green-400">
                    {tip.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {tip.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {tip.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Emergency Resources */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Emergency Resources
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {EMERGENCY_CONTACTS.map((contact, index) => (
              <a
                key={index}
                href={`tel:${contact.number.replace(/-/g, '')}`}
                className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {contact.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {contact.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-700 border-0">
                      {contact.number}
                    </Badge>
                    <Phone className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </Card>

        {/* Report an Issue */}
        <Card className="overflow-hidden">
          <div className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Report a Safety Concern
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  If you've experienced inappropriate behavior, please let us know so we can keep our community safe.
                </p>
                <Link href="/help">
                  <Button variant="outline" className="mt-3">
                    Contact Support
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
