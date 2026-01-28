'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, useUIStore, useMatchStore } from '@crush/core';
import { cn } from '@crush/ui';
import {
  Heart,
  Compass,
  MessageCircle,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { ThemeSwitcher } from '@/shared/components/theme';

const navItems = [
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/matches', label: 'Matches', icon: Heart },
  { href: '/likes', label: 'Likes You', icon: Sparkles, premium: true },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, isMobile } = useUIStore();
  const { matches } = useMatchStore();

  // Count unread messages
  const unreadCount = matches.reduce((acc, m) => acc + m.unreadCount, 0);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out',
          'w-64 lg:w-64',
          isMobile && !sidebarOpen && '-translate-x-full',
          !isMobile && 'translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
            <Link href="/discover" className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-primary fill-primary" />
              <span className="text-lg font-semibold tracking-tight">Crush</span>
            </Link>

            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* User info */}
          {profile && (
            <div className="p-3 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden">
                    {profile.profilePhotoUrl ? (
                      <img
                        src={profile.profilePhotoUrl}
                        alt={profile.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-sm font-medium">
                        {profile.displayName?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-online border-2 border-sidebar rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.isPremium ? 'Premium' : 'Free account'}
                  </p>
                </div>
              </div>

              {/* Upgrade button for free users */}
              {!profile.isPremium && (
                <Link
                  href="/premium"
                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Upgrade to Premium
                </Link>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const showBadge = item.href === '/messages' && unreadCount > 0;
              const isPremiumItem = 'premium' in item && item.premium;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => isMobile && setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isPremiumItem && 'text-yellow-500')} />
                  <span>{item.label}</span>
                  {isPremiumItem && !profile?.isPremium && (
                    <span className="ml-auto text-[10px] text-yellow-600 dark:text-yellow-500 font-medium bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">
                      PRO
                    </span>
                  )}
                  {showBadge && (
                    <span className="ml-auto bg-primary text-primary-foreground text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-sidebar-border space-y-2">
            {/* Theme switcher */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground">Theme</span>
              <ThemeSwitcher />
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 left-3 z-40 p-2 bg-card border border-border rounded-lg shadow-sm lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
