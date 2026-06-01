import { Button } from '@crush/ui';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';

interface Point {
  x: number;
  y: number;
}

interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface PhotoCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onCropComplete: (croppedImageFile: File) => void;
  aspectRatio?: number;
}

// Utility to create a file from the cropped area
const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area,
  fileName = 'cropped-image.jpeg'
): Promise<File> => {
  const image = new Image();
  image.src = imageSrc;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Image could not be loaded'));
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // set canvas size to match the bounding box
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // draw image on canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }

        const file = new File([blob], fileName, { type: 'image/jpeg' });
        resolve(file);
      },
      'image/jpeg',
      0.9
    );
  });
};

export function PhotoCropModal({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio = 3 / 4, // Default portrait aspect ratio
}: PhotoCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsProcessing(false);
    setError(null);
  }, [imageSrc, isOpen]);

  const onCropCompleteHandler = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsProcessing(true);
    setError(null);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
      onClose();
    } catch (e) {
      console.error('Error cropping image:', e);
      setError('Could not crop that image. Try a different photo or crop area.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsProcessing(false);
    setError(null);
    onClose();
  };

  if (!imageSrc) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed left-[50%] top-[50%] z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Adjust Photo
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Crop and zoom your profile photo before uploading it.
            </Dialog.Description>
            <button
              onClick={handleClose}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="Close photo crop editor"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative h-[min(58vh,520px)] min-h-[280px] w-full bg-black">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteHandler}
              onZoomChange={setZoom}
              objectFit="vertical-cover"
            />
          </div>

          <div className="space-y-6 p-6">
            <div className="flex items-center gap-4">
              <ZoomOut className="h-5 w-5 text-gray-500" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary dark:bg-gray-800"
              />
              <ZoomIn className="h-5 w-5 text-gray-500" />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isProcessing}>
                {isProcessing ? 'Saving...' : 'Save Photo'}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
