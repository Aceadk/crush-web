'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore, userService, storageService, locationService } from '@crush/core';
import { Button, Card, Badge, Avatar, AvatarImage, AvatarFallback } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  Camera,
  Edit2,
  Plus,
  X,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Settings,
  Share2,
  Eye,
  ChevronRight,
  Sparkles,
  Heart,
  MessageCircle,
  Shield,
} from 'lucide-react';

export default function ProfileView() {
  const { user, profile, refreshProfile } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [draggedPhoto, setDraggedPhoto] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const photoUrl = await storageService.uploadProfilePhoto(user.uid, file);
      const currentPhotos = profile?.photos || [];
      await userService.updateUserProfile(user.uid, {
        photos: [...currentPhotos, photoUrl],
        profilePhotoUrl: currentPhotos.length === 0 ? photoUrl : profile?.profilePhotoUrl,
      });
      await refreshProfile();
    } catch (error) {
      console.error('Failed to upload photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async (index: number) => {
    if (!user || !profile) return;

    const newPhotos = [...profile.photos];
    newPhotos.splice(index, 1);

    await userService.updateUserProfile(user.uid, {
      photos: newPhotos,
      profilePhotoUrl: newPhotos[0] || undefined,
    });
    await refreshProfile();
  };

  const handleSetMainPhoto = async (index: number) => {
    if (!user || !profile || index === 0) return;

    const newPhotos = [...profile.photos];
    const [photo] = newPhotos.splice(index, 1);
    newPhotos.unshift(photo);

    await userService.updateUserProfile(user.uid, {
      photos: newPhotos,
      profilePhotoUrl: photo,
    });
    await refreshProfile();
  };

  const completeness = profile ? userService.calculateProfileCompleteness(profile) : 0;

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient */}
      <div className="relative h-48 bg-gradient-to-br from-primary via-primary-dark to-secondary">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-4 right-4 flex gap-2">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Settings className="w-5 h-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-24 relative z-10 pb-20">
        {/* Profile header */}
        <div className="text-center mb-6">
          {/* Main photo */}
          <div className="relative inline-block mb-4">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl">
              {profile.profilePhotoUrl ? (
                <img
                  src={profile.profilePhotoUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-4xl font-bold">
                  {profile.displayName?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-dark transition-colors"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Name and badges */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {profile.displayName}
            {profile.age && <span className="font-normal text-gray-600 dark:text-gray-300">, {profile.age}</span>}
          </h1>

          <div className="flex items-center justify-center gap-2 mb-4">
            {profile.isVerified && (
              <Badge variant="verified" className="gap-1">
                <Shield className="w-3 h-3" /> Verified
              </Badge>
            )}
            {profile.isPremium && (
              <Badge variant="premium" className="gap-1">
                <Sparkles className="w-3 h-3" /> Premium
              </Badge>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">-</div>
              <div className="text-xs text-gray-500">Likes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">-</div>
              <div className="text-xs text-gray-500">Matches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{completeness}%</div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>
        </div>

        {/* Profile completion card */}
        {completeness < 100 && (
          <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">Complete your profile</h3>
                <p className="text-sm text-gray-500">Get up to 3x more matches with a complete profile</p>
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                    style={{ width: `${completeness}%` }}
                  />
                </div>
              </div>
              <Link href="/profile/edit">
                <Button size="sm">Complete</Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Photo grid */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Photos</h2>
            <Link href="/profile/edit" className="text-sm text-primary hover:underline">
              Edit
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {profile.photos.map((photo, index) => (
              <div
                key={index}
                className={cn(
                  'relative aspect-[3/4] rounded-xl overflow-hidden group',
                  index === 0 && 'col-span-2 row-span-2'
                )}
              >
                <img src={photo} alt="" className="w-full h-full object-cover" />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {index !== 0 && (
                    <button
                      onClick={() => handleSetMainPhoto(index)}
                      className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"
                      title="Set as main photo"
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemovePhoto(index)}
                    className="p-2 bg-white rounded-full text-red-500 hover:bg-gray-100"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Main photo badge */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded-full">
                    Main photo
                  </div>
                )}
              </div>
            ))}

            {/* Add photo button */}
            {profile.photos.length < 6 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  'aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600',
                  'flex flex-col items-center justify-center gap-2 text-gray-400',
                  'hover:border-primary hover:text-primary transition-colors',
                  uploading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-8 h-8" />
                    <span className="text-xs">Add Photo</span>
                  </>
                )}
              </button>
            )}
          </div>
        </Card>

        {/* About section */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">About</h2>
            <Link href="/profile/edit" className="text-sm text-primary hover:underline">
              Edit
            </Link>
          </div>

          {profile.bio ? (
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{profile.bio}</p>
          ) : (
            <Link href="/profile/edit" className="text-gray-400 hover:text-primary">
              + Add a bio to tell others about yourself
            </Link>
          )}
        </Card>

        {/* Details section */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Details</h2>
            <Link href="/profile/edit" className="text-sm text-primary hover:underline">
              Edit
            </Link>
          </div>

          <div className="space-y-3">
            {profile.location && (profile.location.city || profile.location.country) && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span>{locationService.formatLocationForDisplay(profile.location)}</span>
              </div>
            )}
            {profile.birthDate && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span>{profile.age} years old</span>
              </div>
            )}
          </div>
        </Card>

        {/* Interests section */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Interests</h2>
            <Link href="/profile/edit" className="text-sm text-primary hover:underline">
              Edit
            </Link>
          </div>

          {profile.interests && profile.interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <Badge key={interest} variant="secondary" className="px-3 py-1.5">
                  {interest}
                </Badge>
              ))}
            </div>
          ) : (
            <Link href="/profile/edit" className="text-gray-400 hover:text-primary">
              + Add interests to find better matches
            </Link>
          )}
        </Card>

        {/* Prompts section */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Prompts</h2>
            <Link href="/profile/edit" className="text-sm text-primary hover:underline">
              Edit
            </Link>
          </div>

          {profile.prompts && profile.prompts.length > 0 ? (
            <div className="space-y-4">
              {profile.prompts.map((prompt, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{prompt.question}</p>
                  <p className="text-gray-900 dark:text-white">{prompt.answer}</p>
                </div>
              ))}
            </div>
          ) : (
            <Link href="/profile/edit" className="text-gray-400 hover:text-primary">
              + Add prompts to show your personality
            </Link>
          )}
        </Card>

        {/* Preview profile button */}
        <div className="flex justify-center">
          <Link href="/profile/preview">
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" />
              Preview Profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
