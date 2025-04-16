import React, { useState, useEffect } from 'react';
import { getMainVideo, generateEmbedUrl, Video } from '@/lib/services/videoService';
import { DEFAULT_COMPANY_ID } from '@/lib/utils/constants';

type VideoPlayerProps = {
  companyId?: string;
  category?: 'instructional' | 'ley-karin' | 'compliance' | 'prevention';
  autoplay?: boolean;
  showControls?: boolean;
};

export function VideoPlayer({ 
  companyId = DEFAULT_COMPANY_ID, 
  category = 'instructional',
  autoplay = false,
  showControls = true
}: VideoPlayerProps) {
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // If category is instructional, we fetch the main instructional video
        if (category === 'instructional') {
          const { success, video, error } = await getMainVideo(companyId || 'default');
          
          if (success && video) {
            setVideo(video);
            // Generate embed URL from video URL
            const url = generateEmbedUrl(video.videoUrl, video.platform);
            setEmbedUrl(url);
          } else if (error) {
            setError(error);
          }
        } else {
          // Otherwise, we fetch videos by category (usando servicio directamente)
          const { success, videos, error } = await getVideos(
            category,
            companyId || 'default'
          );
          
          if (success && videos && videos.length > 0) {
            setVideo(videos[0]);
            // Generate embed URL from video URL
            const url = generateEmbedUrl(videos[0].videoUrl, videos[0].platform);
            setEmbedUrl(url);
          } else if (error) {
            setError(error);
          }
        }
      } catch (err) {
        console.error('Error fetching video:', err);
        setError('No se pudo cargar el video. Por favor, inténtelo de nuevo más tarde.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVideo();
  }, [companyId, category]);
  
  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  // If loading, show a skeleton loader
  if (isLoading) {
    return (
      <div className="w-full bg-gray-100 animate-pulse rounded-lg aspect-video"></div>
    );
  }
  
  // If there's an error or no video, show error message
  if (error || !video) {
    return null; // Don't show anything if there's an error
  }
  
  // Function to determine additional URL parameters for embeds
  const getEmbedParams = (platform: string, url: string): string => {
    const separator = url.includes('?') ? '&' : '?';
    
    if (platform === 'youtube') {
      return `${separator}autoplay=${autoplay ? 1 : 0}&controls=${showControls ? 1 : 0}&rel=0`;
    }
    
    if (platform === 'vimeo') {
      return `${separator}autoplay=${autoplay ? 1 : 0}&controls=${showControls ? 1 : 0}`;
    }
    
    return '';
  };
  
  // Final embed URL with parameters
  const finalEmbedUrl = `${embedUrl}${getEmbedParams(video.platform, embedUrl)}`;
  
  return (
    <div className="video-player">
      <div className={`relative ${isExpanded ? 'fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4' : ''}`}>
        <div className={`aspect-video ${isExpanded ? 'w-full max-w-4xl' : 'w-full'}`}>
          <iframe
            src={finalEmbedUrl}
            className="w-full h-full rounded-lg"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        
        {/* Expand/Collapse button */}
        <button 
          className={`absolute ${isExpanded ? 'top-4 right-4 text-white' : 'top-2 right-2'} p-2 bg-gray-800 bg-opacity-70 rounded-full hover:bg-opacity-100 transition-opacity`}
          onClick={toggleExpanded}
        >
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Video title and description */}
      <div className="mt-2">
        <h3 className="text-lg font-medium text-gray-900">{video.title}</h3>
        {video.description && (
          <p className="mt-1 text-sm text-gray-500">{video.description}</p>
        )}
      </div>
    </div>
  );
}