import { db, storage } from '@/lib/firebase/config';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';

export interface Video {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  platform: 'youtube' | 'vimeo' | 'custom';
  isActive: boolean;
  category: 'instructional' | 'ley-karin' | 'compliance' | 'prevention';
  position: number;
  companyId?: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

const VIDEOS_COLLECTION = 'videos';

// Get videos with optional filters
export async function getVideos(
  category?: string,
  companyId?: string
): Promise<{ success: boolean; videos?: Video[]; error?: string }> {
  try {
    let videosQuery = collection(db, VIDEOS_COLLECTION);
    
    // Build query with filters
    const filters = [];
    if (category) {
      filters.push(where('category', '==', category));
    }
    if (companyId) {
      filters.push(where('companyId', '==', companyId));
    }
    filters.push(where('isActive', '==', true));
    filters.push(orderBy('position', 'asc'));
    
    // Add all filters to query
    videosQuery = query(videosQuery, ...filters);
    
    const snapshot = await getDocs(videosQuery);
    const videos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[];
    
    return { success: true, videos };
  } catch (error) {
    console.error('Error fetching videos:', error);
    return { success: false, error: 'Error al obtener videos. Por favor, inténtelo de nuevo.' };
  }
}

// Get the main instructional video
export async function getMainVideo(
  companyId?: string
): Promise<{ success: boolean; video?: Video; error?: string }> {
  try {
    let videosQuery = collection(db, VIDEOS_COLLECTION);
    
    // Build query to get the first instructional video
    const filters = [
      where('category', '==', 'instructional'),
      where('isActive', '==', true),
      orderBy('position', 'asc')
    ];
    
    if (companyId) {
      filters.push(where('companyId', '==', companyId));
    }
    
    videosQuery = query(videosQuery, ...filters);
    
    const snapshot = await getDocs(videosQuery);
    if (snapshot.empty) {
      return { success: true, video: undefined };
    }
    
    const video = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as Video;
    
    return { success: true, video };
  } catch (error) {
    console.error('Error fetching main video:', error);
    return { success: false, error: 'Error al obtener el video principal. Por favor, inténtelo de nuevo.' };
  }
}

// Get a specific video by ID
export async function getVideoById(
  videoId: string
): Promise<{ success: boolean; video?: Video; error?: string }> {
  try {
    const videoRef = doc(db, VIDEOS_COLLECTION, videoId);
    const videoDoc = await getDoc(videoRef);
    
    if (!videoDoc.exists()) {
      return { success: false, error: 'Video no encontrado' };
    }
    
    const video = {
      id: videoDoc.id,
      ...videoDoc.data()
    } as Video;
    
    return { success: true, video };
  } catch (error) {
    console.error('Error fetching video:', error);
    return { success: false, error: 'Error al obtener el video. Por favor, inténtelo de nuevo.' };
  }
}

// Create a video from external source (YouTube/Vimeo)
export async function createVideo(
  videoData: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; videoId?: string; error?: string }> {
  try {
    // Validate video URL based on platform
    if (!validateVideoUrl(videoData.videoUrl, videoData.platform)) {
      return { success: false, error: 'URL de video inválida para la plataforma seleccionada' };
    }
    
    // Add timestamps
    const videoWithTimestamps = {
      ...videoData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Create document in Firestore
    const docRef = await addDoc(collection(db, VIDEOS_COLLECTION), videoWithTimestamps);
    
    return { success: true, videoId: docRef.id };
  } catch (error) {
    console.error('Error creating video:', error);
    return { success: false, error: 'Error al crear el video. Por favor, inténtelo de nuevo.' };
  }
}

// Upload a custom video file
export async function uploadCustomVideo(
  file: File,
  videoData: Omit<Video, 'id' | 'videoUrl' | 'createdAt' | 'updatedAt'>,
  thumbnailFile?: File
): Promise<{ success: boolean; videoId?: string; error?: string }> {
  try {
    // Check if file is a video
    if (!file.type.startsWith('video/')) {
      return { success: false, error: 'El archivo debe ser un video' };
    }
    
    // Upload video to Firebase Storage
    const videoStorageRef = ref(storage, `videos/${Date.now()}_${file.name}`);
    await uploadBytes(videoStorageRef, file);
    const videoUrl = await getDownloadURL(videoStorageRef);
    
    // Upload thumbnail if provided, otherwise use default
    let thumbnailUrl = '';
    if (thumbnailFile) {
      const thumbnailStorageRef = ref(storage, `videos/thumbnails/${Date.now()}_${thumbnailFile.name}`);
      await uploadBytes(thumbnailStorageRef, thumbnailFile);
      thumbnailUrl = await getDownloadURL(thumbnailStorageRef);
    }
    
    // Create video in Firestore
    const videoWithUrls = {
      ...videoData,
      videoUrl,
      thumbnailUrl,
      platform: 'custom' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, VIDEOS_COLLECTION), videoWithUrls);
    
    return { success: true, videoId: docRef.id };
  } catch (error) {
    console.error('Error uploading custom video:', error);
    return { success: false, error: 'Error al subir el video. Por favor, inténtelo de nuevo.' };
  }
}

// Update a video
export async function updateVideo(
  videoId: string,
  videoData: Partial<Omit<Video, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate URL if it's being updated
    if (videoData.videoUrl && videoData.platform) {
      if (!validateVideoUrl(videoData.videoUrl, videoData.platform)) {
        return { success: false, error: 'URL de video inválida para la plataforma seleccionada' };
      }
    }
    
    const videoRef = doc(db, VIDEOS_COLLECTION, videoId);
    
    // Add updated timestamp
    await updateDoc(videoRef, {
      ...videoData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating video:', error);
    return { success: false, error: 'Error al actualizar el video. Por favor, inténtelo de nuevo.' };
  }
}

// Delete a video
export async function deleteVideo(
  videoId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the video first to check if it's a custom video
    const { success, video, error } = await getVideoById(videoId);
    
    if (!success || !video) {
      return { success: false, error: error || 'Video no encontrado' };
    }
    
    // If it's a custom video, delete the file from Storage
    if (video.platform === 'custom') {
      try {
        // Extract file path from URL
        const fileUrl = new URL(video.videoUrl);
        const filePath = decodeURIComponent(fileUrl.pathname.split('/o/')[1].split('?')[0]);
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
        
        // Delete thumbnail if it exists
        if (video.thumbnailUrl) {
          const thumbnailUrl = new URL(video.thumbnailUrl);
          const thumbnailPath = decodeURIComponent(thumbnailUrl.pathname.split('/o/')[1].split('?')[0]);
          const thumbnailRef = ref(storage, thumbnailPath);
          await deleteObject(thumbnailRef);
        }
      } catch (storageError) {
        console.error('Error deleting video file from storage:', storageError);
        // Continue with deletion from Firestore even if storage deletion fails
      }
    }
    
    // Delete from Firestore
    const videoRef = doc(db, VIDEOS_COLLECTION, videoId);
    await deleteDoc(videoRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting video:', error);
    return { success: false, error: 'Error al eliminar el video. Por favor, inténtelo de nuevo.' };
  }
}

// Update video positions
export async function updateVideoPositions(
  videoPositions: { id: string; position: number }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create batch updates
    const updates = videoPositions.map(({ id, position }) => {
      const videoRef = doc(db, VIDEOS_COLLECTION, id);
      return updateDoc(videoRef, { 
        position, 
        updatedAt: serverTimestamp() 
      });
    });
    
    // Execute all updates
    await Promise.all(updates);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating video positions:', error);
    return { success: false, error: 'Error al actualizar las posiciones de los videos. Por favor, inténtelo de nuevo.' };
  }
}

// Toggle video active status
export async function toggleVideoStatus(
  videoId: string, 
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const videoRef = doc(db, VIDEOS_COLLECTION, videoId);
    await updateDoc(videoRef, { 
      isActive, 
      updatedAt: serverTimestamp() 
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling video status:', error);
    return { success: false, error: 'Error al actualizar el estado del video. Por favor, inténtelo de nuevo.' };
  }
}

// Utility function to validate video URLs
function validateVideoUrl(url: string, platform: 'youtube' | 'vimeo' | 'custom'): boolean {
  if (platform === 'custom') {
    // For custom videos, just check if it's a valid URL
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  if (platform === 'youtube') {
    // Check for YouTube URL formats: standard, shortened, or embed
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  }
  
  if (platform === 'vimeo') {
    // Check for Vimeo URL formats
    const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|)(\d+)(?:|\/\?)|player\.vimeo\.com\/video\/(\d+))/;
    return vimeoRegex.test(url);
  }
  
  return false;
}

// Extract video ID from URL
export function extractVideoId(url: string, platform: 'youtube' | 'vimeo' | 'custom'): string | null {
  if (platform === 'custom') {
    return null;
  }
  
  if (platform === 'youtube') {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }
  
  if (platform === 'vimeo') {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|)(\d+)(?:|\/\?)|player\.vimeo\.com\/video\/(\d+))/);
    return match ? match[2] || match[3] : null;
  }
  
  return null;
}

// Generate embed URL from video URL
export function generateEmbedUrl(url: string, platform: 'youtube' | 'vimeo' | 'custom'): string {
  if (platform === 'custom') {
    return url;
  }
  
  const videoId = extractVideoId(url, platform);
  
  if (!videoId) {
    return url;
  }
  
  if (platform === 'youtube') {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  if (platform === 'vimeo') {
    return `https://player.vimeo.com/video/${videoId}`;
  }
  
  return url;
}

// Generate thumbnail URL from video URL
export function generateThumbnailUrl(url: string, platform: 'youtube' | 'vimeo' | 'custom'): string | null {
  if (platform === 'custom') {
    return null;
  }
  
  const videoId = extractVideoId(url, platform);
  
  if (!videoId) {
    return null;
  }
  
  if (platform === 'youtube') {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  
  // Vimeo doesn't have a direct thumbnail URL we can generate without API
  return null;
}