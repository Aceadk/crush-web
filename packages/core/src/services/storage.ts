import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  UploadTask,
} from 'firebase/storage';
import { getFirebaseStorage } from '../firebase/config';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB for voice notes
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'];

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
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
    const urls = await Promise.all(
      result.items.map((itemRef) => getDownloadURL(itemRef))
    );

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
    return originalUrl.replace(
      /\/([^/?]+)(\?|$)/,
      `/thumb_${sizeMap[size]}_$1$2`
    );
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
      throw new Error(`File type ${file.type} is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
    }
  }
}

export const storageService = new StorageService();
