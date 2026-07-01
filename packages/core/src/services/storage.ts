import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { getFirebaseStorage } from '../firebase/config';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB for voice notes
const MAX_STORY_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_STORY_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'];
const ALLOWED_STORY_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
}

export function describeProfilePhotoUploadError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'storage/unauthorized':
    case 'storage/unauthenticated':
      return "We couldn't save that photo because your upload session was rejected. Sign out and back in, then try again.";
    case 'storage/quota-exceeded':
      return 'Photo storage is temporarily full. Please try again later.';
    case 'storage/retry-limit-exceeded':
    case 'storage/canceled':
      return 'The upload did not finish. Check your connection and try again.';
    default:
      if (error instanceof Error && error.message) {
        return `Couldn't upload that photo: ${error.message}`;
      }
      return "Couldn't upload that photo. Please try a different image or try again.";
  }
}

class StorageService {
  /**
   * Upload a profile photo
   */
  async uploadProfilePhoto(
    userId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    this.validateFile(file);

    const storage = getFirebaseStorage();
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `users/${userId}/photos/${fileName}`);

    if (onProgress) {
      return this.uploadWithProgress(storageRef, file, onProgress);
    }

    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  /**
   * Upload story media (photo or short video)
   */
  async uploadStoryMedia(
    userId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    this.validateStoryFile(file);

    const storage = getFirebaseStorage();
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `users/${userId}/stories/${fileName}`);

    if (onProgress) {
      return this.uploadWithProgress(storageRef, file, onProgress);
    }

    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  /**
   * Upload a chat image
   */
  async uploadChatImage(
    conversationId: string,
    senderId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    this.validateFile(file);

    const storage = getFirebaseStorage();
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(
      storage,
      `conversations/${conversationId}/images/${senderId}/${fileName}`
    );

    if (onProgress) {
      return this.uploadWithProgress(storageRef, file, onProgress);
    }

    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  /**
   * Upload a voice note
   */
  async uploadVoiceNote(
    conversationId: string,
    senderId: string,
    audioBlob: Blob,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    // Validate audio size
    if (audioBlob.size > MAX_AUDIO_SIZE) {
      throw new Error(`Voice note exceeds ${MAX_AUDIO_SIZE / 1024 / 1024}MB limit`);
    }

    if (audioBlob.type && !ALLOWED_AUDIO_TYPES.includes(audioBlob.type)) {
      throw new Error(
        `Audio type ${audioBlob.type} is not allowed. Allowed types: ${ALLOWED_AUDIO_TYPES.join(', ')}`
      );
    }

    const storage = getFirebaseStorage();
    const fileName = `${Date.now()}_voice.webm`;
    const storageRef = ref(
      storage,
      `conversations/${conversationId}/audio/${senderId}/${fileName}`
    );

    if (onProgress) {
      return this.uploadBlobWithProgress(storageRef, audioBlob, onProgress);
    }

    await uploadBytes(storageRef, audioBlob);
    return getDownloadURL(storageRef);
  }

  /**
   * Delete a file
   */
  async deleteFile(url: string): Promise<void> {
    const storage = getFirebaseStorage();
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  }

  /**
   * Get all profile photos for a user
   */
  async getProfilePhotos(userId: string): Promise<string[]> {
    const storage = getFirebaseStorage();
    const listRef = ref(storage, `users/${userId}/photos`);

    const result = await listAll(listRef);
    const urls = await Promise.all(result.items.map((itemRef) => getDownloadURL(itemRef)));

    return urls;
  }

  /**
   * Delete all photos for a user
   */
  async deleteAllUserPhotos(userId: string): Promise<void> {
    const storage = getFirebaseStorage();
    const listRef = ref(storage, `users/${userId}/photos`);

    const result = await listAll(listRef);
    await Promise.all(result.items.map((itemRef) => deleteObject(itemRef)));
  }

  /**
   * Generate a thumbnail URL (if using Firebase Extensions)
   */
  getThumbnailUrl(originalUrl: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    // If using Firebase Extensions for image resizing
    const sizeMap = {
      small: '100x100',
      medium: '300x300',
      large: '600x600',
    };

    // This assumes the Firebase Extension naming convention
    // Adjust based on your actual setup
    return originalUrl.replace(/\/([^/?]+)(\?|$)/, `/thumb_${sizeMap[size]}_$1$2`);
  }

  /**
   * Upload with progress tracking
   */
  private uploadWithProgress(
    storageRef: ReturnType<typeof ref>,
    file: File,
    onProgress: (progress: UploadProgress) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress({
            progress,
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
          });
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        }
      );
    });
  }

  /**
   * Upload blob with progress tracking (for voice notes)
   */
  private uploadBlobWithProgress(
    storageRef: ReturnType<typeof ref>,
    blob: Blob,
    onProgress: (progress: UploadProgress) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress({
            progress,
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
          });
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        }
      );
    });
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(
        `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      );
    }
  }

  /**
   * Validate story media file before upload
   */
  private validateStoryFile(file: File): void {
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      if (file.size > MAX_STORY_IMAGE_SIZE) {
        throw new Error(`Story image exceeds ${MAX_STORY_IMAGE_SIZE / 1024 / 1024}MB limit`);
      }
      return;
    }

    if (ALLOWED_STORY_VIDEO_TYPES.includes(file.type)) {
      if (file.size > MAX_STORY_VIDEO_SIZE) {
        throw new Error(`Story video exceeds ${MAX_STORY_VIDEO_SIZE / 1024 / 1024}MB limit`);
      }
      return;
    }

    throw new Error(`Unsupported story media type ${file.type}. Use an image or MP4/WebM video.`);
  }
}

export const storageService = new StorageService();
