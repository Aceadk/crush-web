'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Camera, GripVertical, X, Crown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@crush/ui';

interface Photo {
  id: string;
  url: string;
}

interface PhotoGridReorderProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  isUploading?: boolean;
  maxPhotos?: number;
  className?: string;
}

export function PhotoGridReorder({
  photos,
  onPhotosChange,
  onAddPhoto,
  onRemovePhoto,
  isUploading = false,
  maxPhotos = 6,
  className = '',
}: PhotoGridReorderProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Convert photos array to objects with IDs for @dnd-kit
  const photoItems: Photo[] = photos.map((url, index) => ({
    id: `photo-${index}-${url.slice(-10)}`,
    url,
  }));

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
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {photoItems.map((photo, index) => (
              <SortablePhotoItem
                key={photo.id}
                photo={photo}
                index={index}
                isMain={index === 0}
                onRemove={() => onRemovePhoto(index)}
                isDragging={activeId === photo.id}
              />
            ))}

            {/* Add photo button */}
            {photos.length < maxPhotos && (
              <AddPhotoButton
                onClick={onAddPhoto}
                isUploading={isUploading}
                isEmpty={photos.length === 0}
              />
            )}
          </div>
        </SortableContext>

        {/* Drag overlay - the "ghost" element that follows the cursor */}
        <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
          {activePhoto ? (
            <PhotoOverlayItem photo={activePhoto} isMain={photoItems[0]?.id === activePhoto.id} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground mt-3 text-center">
        {photos.length === 0
          ? 'Add photos to get started'
          : 'Drag photos to reorder. First photo is your main profile picture.'}
      </p>
    </div>
  );
}

// Sortable photo item component
interface SortablePhotoItemProps {
  photo: Photo;
  index: number;
  isMain: boolean;
  onRemove: () => void;
  isDragging: boolean;
}

function SortablePhotoItem({ photo, index, isMain, onRemove, isDragging }: SortablePhotoItemProps) {
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
        'relative rounded-xl overflow-hidden group touch-none',
        isMain ? 'col-span-2 row-span-2' : '',
        isDragging ? 'opacity-40' : ''
      )}
    >
      <div className={cn('aspect-[3/4] w-full', isMain && 'aspect-auto h-full')}>
        <img
          src={photo.url}
          alt={`Photo ${index + 1}`}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* Drag handle overlay - covers the entire photo */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      >
        {/* Drag handle indicator */}
        <div className="absolute top-2 left-2 p-1.5 bg-black/50 rounded-lg text-white opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm">
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      {/* Remove button - positioned outside drag handle area */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 backdrop-blur-sm z-10"
        type="button"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Main photo badge */}
      {isMain && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-full shadow-lg">
          <Crown className="w-3 h-3" />
          Main photo
        </div>
      )}

      {/* Photo number indicator */}
      {!isMain && (
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm">
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
        'rounded-xl overflow-hidden shadow-2xl ring-2 ring-primary',
        isMain ? 'w-48 sm:w-64' : 'w-24 sm:w-32'
      )}
    >
      <div className={cn('aspect-[3/4]', isMain && 'aspect-auto')}>
        <img
          src={photo.url}
          alt="Dragging"
          className="w-full h-full object-cover"
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
          ? 'border-muted cursor-not-allowed opacity-60'
          : 'border-muted-foreground/30 hover:border-primary hover:bg-primary/5 cursor-pointer',
        isEmpty ? 'col-span-2 row-span-2' : ''
      )}
      type="button"
    >
      {isUploading ? (
        <>
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground">Uploading...</span>
        </>
      ) : (
        <>
          <div className="p-3 rounded-full bg-muted">
            {isEmpty ? (
              <Camera className="w-8 h-8 text-muted-foreground" />
            ) : (
              <Plus className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {isEmpty ? 'Add your first photo' : 'Add photo'}
          </span>
          {isEmpty && (
            <span className="text-xs text-muted-foreground mt-1">
              Tap to upload
            </span>
          )}
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
        'flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'opacity-50 ring-2 ring-primary'
      )}
    >
      <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
    </div>
  );
}
