'use client';

import { cn } from '@crush/ui';
import {
  MAX_PROFILE_PHOTOS,
  PROFILE_PHOTO_ALLOWED_MIME_TYPES,
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_MAX_DIMENSION_PX,
  PROFILE_PHOTO_MIN_DIMENSION_PX,
} from '@crush/core';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, ArrowRight, Camera, Crown, GripVertical, Loader2, Plus, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useMemo, useRef, useState } from 'react';

const PhotoCropModal = dynamic(
  () => import('./photo-crop-modal').then((mod) => mod.PhotoCropModal),
  { ssr: false }
);

interface Photo {
  id: string;
  url: string;
}

interface PhotoGridReorderProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  onAddPhoto: (file?: File) => void;
  onRemovePhoto: (index: number) => void;
  isUploading?: boolean;
  maxPhotos?: number;
  className?: string;
  onError?: (message: string) => void;
}

const ACCEPTED_IMAGE_TYPES = new Set<string>(PROFILE_PHOTO_ALLOWED_MIME_TYPES);
const CROPPABLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function createStablePhotoId(url: string, index: number, allPhotos: string[]): string {
  const duplicateIndex =
    allPhotos.slice(0, index + 1).filter((candidate) => candidate === url).length - 1;
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash * 31 + url.charCodeAt(i)) | 0;
  }

  return `photo-${Math.abs(hash).toString(36)}-${duplicateIndex}`;
}

export function PhotoGridReorder({
  photos,
  onPhotosChange,
  onAddPhoto,
  onRemovePhoto,
  isUploading = false,
  maxPhotos = MAX_PROFILE_PHOTOS,
  className = '',
  onError,
}: PhotoGridReorderProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Cropping State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const photoItems: Photo[] = useMemo(
    () =>
      photos.map((url, index) => ({
        id: createStablePhotoId(url, index, photos),
        url,
      })),
    [photos]
  );

  const setPickerError = useCallback(
    (message: string) => {
      setLocalError(message);
      onError?.(message);
    },
    [onError]
  );

  // Configure sensors for both pointer (mouse) and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms press and hold before drag starts
        tolerance: 5, // 5px movement tolerance during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = photoItems.findIndex((item) => item.id === active.id);
        const newIndex = photoItems.findIndex((item) => item.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newPhotos = arrayMove(photos, oldIndex, newIndex);
          onPhotosChange(newPhotos);
        }
      }
    },
    [photos, photoItems, onPhotosChange]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError(null);

    if (photos.length >= maxPhotos) {
      setPickerError(`You can upload up to ${maxPhotos} profile photos.`);
      e.target.value = '';
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setPickerError('Choose a JPEG, PNG, WebP, HEIC, or HEIF image.');
      e.target.value = '';
      return;
    }

    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      setPickerError('Choose an image smaller than 10 MB.');
      e.target.value = '';
      return;
    }

    // Browser crop/decode support for HEIC/HEIF is inconsistent. Preserve the
    // canonical iOS-friendly upload contract and let the shared upload precheck
    // use createImageBitmap when available, otherwise defer dimensions to the
    // authoritative server validator.
    if (!CROPPABLE_IMAGE_TYPES.has(file.type)) {
      onAddPhoto(file);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.onerror = () => {
      setPickerError('Could not read that image. Try another photo.');
    };
    reader.readAsDataURL(file);

    // Reset file input so selecting the same file again works
    e.target.value = '';
  };

  const handleCropComplete = (croppedFile: File) => {
    if (photos.length >= maxPhotos) {
      setPickerError(`You can upload up to ${maxPhotos} profile photos.`);
      return;
    }

    setLocalError(null);
    onAddPhoto(croppedFile);
  };

  const handleAddClick = () => {
    if (photos.length >= maxPhotos) {
      setPickerError(`You can upload up to ${maxPhotos} profile photos.`);
      return;
    }

    setLocalError(null);
    fileInputRef.current?.click();
  };

  const movePhoto = useCallback(
    (index: number, direction: -1 | 1) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= photos.length) return;
      onPhotosChange(arrayMove(photos, index, nextIndex));
    },
    [photos, onPhotosChange]
  );

  const activePhoto = photoItems.find((item) => item.id === activeId);

  return (
    <div className={className}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={photoItems.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
            {photoItems.map((photo, index) => (
              <SortablePhotoItem
                key={photo.id}
                photo={photo}
                index={index}
                photoCount={photoItems.length}
                isMain={index === 0}
                onRemove={() => onRemovePhoto(index)}
                onMoveEarlier={index === 0 ? undefined : () => movePhoto(index, -1)}
                onMoveLater={
                  index === photoItems.length - 1 ? undefined : () => movePhoto(index, 1)
                }
                isDragging={activeId === photo.id}
              />
            ))}

            {/* Add photo button */}
            {photos.length < maxPhotos && (
              <AddPhotoButton
                onClick={handleAddClick}
                isUploading={isUploading}
                isEmpty={photos.length === 0}
              />
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
          />
        </SortableContext>

        {/* Drag overlay - the "ghost" element that follows the cursor */}
        <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
          {activePhoto ? (
            <PhotoOverlayItem photo={activePhoto} isMain={photoItems[0]?.id === activePhoto.id} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Helper text */}
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {photos.length === 0
          ? 'Add a clear first photo before your profile is visible.'
          : 'Drag photos or use the move buttons to reorder. First photo is your main profile picture.'}
      </p>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        JPEG, PNG, WebP, HEIC, or HEIF; {PROFILE_PHOTO_MIN_DIMENSION_PX}–
        {PROFILE_PHOTO_MAX_DIMENSION_PX}px per side; maximum 10 MB. Server checks remain final.
      </p>
      {localError && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
          {localError}
        </p>
      )}

      <PhotoCropModal
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          setCropImageSrc(null);
        }}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}

// Sortable photo item component
interface SortablePhotoItemProps {
  photo: Photo;
  index: number;
  photoCount: number;
  isMain: boolean;
  onRemove: () => void;
  onMoveEarlier?: () => void;
  onMoveLater?: () => void;
  isDragging: boolean;
}

function SortablePhotoItem({
  photo,
  index,
  photoCount,
  isMain,
  onRemove,
  onMoveEarlier,
  onMoveLater,
  isDragging,
}: SortablePhotoItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative touch-none overflow-hidden rounded-xl',
        isMain ? 'col-span-2 row-span-2' : '',
        isDragging ? 'opacity-40' : ''
      )}
    >
      <div className={cn('relative aspect-[3/4] w-full', isMain && 'aspect-auto h-full')}>
        <Image
          src={photo.url}
          alt={`Photo ${index + 1}`}
          fill
          sizes={isMain ? '(max-width: 640px) 100vw, 50vw' : '150px'}
          className="object-cover"
          draggable={false}
        />
      </div>

      {/* Drag handle overlay - covers the entire photo for pointer and keyboard sorting */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary active:cursor-grabbing"
        aria-label={`Reorder photo ${index + 1}`}
      >
        {/* Drag handle indicator */}
        <div className="absolute left-2 top-2 rounded-lg bg-black/50 p-1.5 text-white opacity-100 backdrop-blur-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <GripVertical className="h-4 w-4" />
        </div>
      </div>

      {photoCount > 1 && (
        <div className="absolute bottom-2 right-2 z-10 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveEarlier?.();
            }}
            disabled={!onMoveEarlier}
            className="rounded-lg bg-black/55 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Move photo ${index + 1} earlier`}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveLater?.();
            }}
            disabled={!onMoveLater}
            className="rounded-lg bg-black/55 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Move photo ${index + 1} later`}
            type="button"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Remove button - positioned outside drag handle area */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-2 top-2 z-10 rounded-lg bg-black/50 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-red-500 group-hover:opacity-100"
        aria-label={`Remove photo ${index + 1}`}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Main photo badge */}
      {isMain && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
          <Crown className="h-3 w-3" />
          Main photo
        </div>
      )}

      {/* Photo number indicator */}
      {!isMain && (
        <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">
          {index + 1}
        </div>
      )}
    </div>
  );
}

// Overlay component shown while dragging
interface PhotoOverlayItemProps {
  photo: Photo;
  isMain: boolean;
}

function PhotoOverlayItem({ photo, isMain }: PhotoOverlayItemProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl shadow-2xl ring-2 ring-primary',
        isMain ? 'w-48 sm:w-64' : 'w-24 sm:w-32'
      )}
    >
      <div className={cn('relative aspect-[3/4]', isMain && 'aspect-auto')}>
        <Image
          src={photo.url}
          alt="Dragging"
          fill
          sizes={isMain ? '300px' : '150px'}
          className="object-cover"
          draggable={false}
        />
      </div>
    </div>
  );
}

// Add photo button component
interface AddPhotoButtonProps {
  onClick: () => void;
  isUploading: boolean;
  isEmpty: boolean;
}

function AddPhotoButton({ onClick, isUploading, isEmpty }: AddPhotoButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isUploading}
      className={cn(
        'aspect-[3/4] rounded-xl border-2 border-dashed',
        'flex flex-col items-center justify-center gap-2',
        'transition-all duration-200',
        isUploading
          ? 'cursor-not-allowed border-muted opacity-60'
          : 'cursor-pointer border-muted-foreground/30 hover:border-primary hover:bg-primary/5',
        isEmpty ? 'col-span-2 row-span-2' : ''
      )}
      type="button"
      aria-label={isEmpty ? 'Add your first profile photo' : 'Add profile photo'}
    >
      {isUploading ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Uploading...</span>
        </>
      ) : (
        <>
          <div className="rounded-full bg-muted p-3">
            {isEmpty ? (
              <Camera className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Plus className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {isEmpty ? 'Add your first photo' : 'Add photo'}
          </span>
          {isEmpty && <span className="mt-1 text-xs text-muted-foreground">Tap to upload</span>}
        </>
      )}
    </button>
  );
}

// Export a simpler version for onboarding/quick use
interface SimplePhotoReorderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
}

export function SimplePhotoReorder({ photos, onChange }: SimplePhotoReorderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const items = photos.map((url, i) => ({ id: `${i}`, url }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onChange(arrayMove(photos, oldIndex, newIndex));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {items.map((item, index) => (
            <SimpleSortableItem key={item.id} id={item.id} url={item.url} index={index} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SimpleSortableItem({ id, url, index }: { id: string; url: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'relative h-20 w-16 flex-shrink-0 cursor-grab touch-none overflow-hidden rounded-lg active:cursor-grabbing',
        isDragging && 'opacity-50 ring-2 ring-primary'
      )}
    >
      <Image
        src={url}
        alt={`Photo ${index + 1}`}
        fill
        sizes="100px"
        className="object-cover"
        draggable={false}
      />
    </div>
  );
}
