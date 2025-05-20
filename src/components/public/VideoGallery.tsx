import React, { useState, useEffect } from 'react';
import { getVideos, generateEmbedUrl, extractVideoId, Video } from '@/lib/services/videoService';
import { DEFAULT_COMPANY_ID } from '@/lib/utils/constants';

type VideoGalleryProps = {
  companyId?: string;
  category?: 'instructional' | 'ley-karin' | 'compliance' | 'prevention';
  maxInitialVideos?: number;
};

export function VideoGallery({ 
  companyId = DEFAULT_COMPANY_ID, 
  category,
  maxInitialVideos = 3
}: VideoGalleryProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Usar servicio directamente en lugar de API fetch
        const { success, videos, error } = await getVideos(
          category, 
          companyId || 'default'
        );
        
        if (success && videos) {
          setVideos(videos);
        } else if (error) {
          setError(error);
        }
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('No se pudieron cargar los videos. Por favor, inténtelo de nuevo más tarde.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVideos();
  }, [companyId, category]);
  
  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Determine videos to show based on expanded state
  const videosToShow = isExpanded ? videos : videos.slice(0, maxInitialVideos);
  
  // Show expand button only if there are more videos than the initial max
  const showExpandButton = videos.length > maxInitialVideos;
  
  // Open video modal
  const openVideoModal = (video: Video) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
  };
  
  // Close video modal
  const closeVideoModal = () => {
    setIsModalOpen(false);
  };
  
  // Generate thumbnail URL for video
  const generateThumbnail = (video: Video): string => {
    if (video.thumbnailUrl) {
      return video.thumbnailUrl;
    }
    
    if (video.platform === 'youtube') {
      const videoId = extractVideoId(video.videoUrl, 'youtube');
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
    
    // Default thumbnail for non-YouTube videos without thumbnails
    return '/video-placeholder.svg';
  };
  
  // If loading, show a skeleton loader
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-gray-100 animate-pulse rounded-lg aspect-video"></div>
        ))}
      </div>
    );
  }
  
  // If there's an error or no videos, show error message or nothing
  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }
  
  if (videos.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-100 rounded-lg p-6 text-center">
        <svg 
          className="h-12 w-12 mx-auto text-gray-400 mb-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay videos disponibles
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          No se encontraron videos en esta categoría. Si necesita más información, póngase en contacto con el administrador.
        </p>
      </div>
    );
  }
  
  return (
    <div className="video-gallery">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videosToShow.map((video) => (
          <div 
            key={video.id} 
            className="cursor-pointer group overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow"
            onClick={() => openVideoModal(video)}
          >
            <div className="aspect-video relative">
              <img 
                src={generateThumbnail(video)} 
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-16 h-16 rounded-full bg-white bg-opacity-80 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-3">
              <h3 className="text-md font-medium text-gray-900 line-clamp-1">{video.title}</h3>
              {video.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{video.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Show "Ver más" / "Ver menos" button if needed */}
      {showExpandButton && (
        <div className="mt-4 text-center">
          <button 
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={toggleExpanded}
          >
            {isExpanded ? (
              <>
                Ver menos
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </>
            ) : (
              <>
                Ver más
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Video Modal */}
      {isModalOpen && selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 line-clamp-1">
                {selectedVideo.title}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={closeVideoModal}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="aspect-video">
                <iframe
                  src={generateEmbedUrl(selectedVideo.videoUrl, selectedVideo.platform)}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
            {selectedVideo.description && (
              <div className="p-4 border-t border-gray-200 overflow-y-auto max-h-32">
                <p className="text-sm text-gray-600">{selectedVideo.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}