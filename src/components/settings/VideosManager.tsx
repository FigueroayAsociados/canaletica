import React, { useState, useEffect, useCallback } from 'react';
import { 
  getVideos, 
  createVideo, 
  updateVideo,
  deleteVideo, 
  toggleVideoStatus,
  updateVideoPositions,
  uploadCustomVideo,
  Video
} from '@/lib/services/videoService';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { useCompany } from '@/lib/hooks';

interface VideoFormData {
  title: string;
  description: string;
  videoUrl: string;
  platform: 'youtube' | 'vimeo' | 'custom';
  category: 'instructional' | 'ley-karin' | 'compliance' | 'prevention';
  videoFile?: File | null;
  thumbnailFile?: File | null;
}

const INITIAL_FORM_DATA: VideoFormData = {
  title: '',
  description: '',
  videoUrl: '',
  platform: 'youtube',
  category: 'instructional',
  videoFile: null,
  thumbnailFile: null,
};

export default function VideosManager() {
  const { companyId } = useCompany();
  const [videos, setVideos] = useState<Video[]>([]);
  const [formData, setFormData] = useState<VideoFormData>(INITIAL_FORM_DATA);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Fetch videos on component mount or when company/category changes
  const fetchVideos = useCallback(async () => {
    const category = activeCategory === 'all' ? undefined : activeCategory;
    const { success, videos, error } = await getVideos(
      category, 
      companyId
    );
    
    if (success && videos) {
      setVideos(videos);
    } else if (error) {
      setError(error);
    }
  }, [activeCategory, companyId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle file input changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedVideo(null);
  };

  // Handle form submission for creating/updating videos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      let result;
      
      // Determine if we're creating a new video or updating an existing one
      if (!selectedVideo) {
        // Usar el ID de la empresa del contexto
        const videoCompanyId = companyId || 'default';
        
        // Creating a new video
        if (formData.platform === 'custom' && formData.videoFile) {
          // Upload custom video
          result = await uploadCustomVideo(
            formData.videoFile,
            {
              title: formData.title,
              description: formData.description,
              platform: 'custom',
              isActive: true,
              category: formData.category,
              position: videos.length,
              companyId: videoCompanyId,
              thumbnailUrl: ''
            },
            formData.thumbnailFile
          );
        } else {
          // Create video from external source
          result = await createVideo({
            title: formData.title,
            description: formData.description,
            videoUrl: formData.videoUrl,
            platform: formData.platform,
            isActive: true,
            category: formData.category,
            position: videos.length,
            companyId: videoCompanyId
          });
        }
        
        if (result.success) {
          setSuccess('Video creado exitosamente');
          resetForm();
          await fetchVideos();
        } else {
          setError(result.error || 'Error al crear el video');
        }
      } else {
        // Updating an existing video
        const updateData: Partial<Video> = {
          title: formData.title,
          description: formData.description,
          category: formData.category
        };
        
        // Only update URL if platform hasn't changed or if it's not a custom video
        if (formData.platform !== 'custom' || videos.find(v => v.id === selectedVideo)?.platform !== 'custom') {
          updateData.videoUrl = formData.videoUrl;
          updateData.platform = formData.platform;
        }
        
        result = await updateVideo(selectedVideo, updateData);
        
        if (result.success) {
          setSuccess('Video actualizado exitosamente');
          resetForm();
          await fetchVideos();
        } else {
          setError(result.error || 'Error al actualizar el video');
        }
      }
    } catch (err) {
      setError('Error inesperado. Por favor, inténtelo de nuevo.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle editing a video
  const handleEdit = (video: Video) => {
    setFormData({
      title: video.title,
      description: video.description || '',
      videoUrl: video.videoUrl,
      platform: video.platform,
      category: video.category,
      videoFile: null,
      thumbnailFile: null
    });
    setSelectedVideo(video.id);
  };

  // Handle deleting a video
  const handleDelete = async (videoId: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar este video?')) {
      return;
    }
    
    setError(null);
    setSuccess(null);
    
    const result = await deleteVideo(videoId);
    
    if (result.success) {
      setSuccess('Video eliminado exitosamente');
      await fetchVideos();
    } else {
      setError(result.error || 'Error al eliminar el video');
    }
  };

  // Handle toggling video active status
  const handleToggleStatus = async (videoId: string, currentStatus: boolean) => {
    setError(null);
    setSuccess(null);
    
    const result = await toggleVideoStatus(videoId, !currentStatus);
    
    if (result.success) {
      setSuccess(`Video ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`);
      await fetchVideos();
    } else {
      setError(result.error || 'Error al cambiar el estado del video');
    }
  };

  // Drag and drop functionality for reordering videos
  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggingIndex === null) return;
    if (draggingIndex === index) return;
    
    const newVideos = [...videos];
    const draggedVideo = newVideos[draggingIndex];
    
    // Remove the dragged video
    newVideos.splice(draggingIndex, 1);
    // Insert it at the new position
    newVideos.splice(index, 0, draggedVideo);
    
    // Update local state
    setVideos(newVideos);
    setDraggingIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggingIndex === null) return;
    
    setDraggingIndex(null);
    
    // Update positions in database
    const videoPositions = videos.map((video, index) => ({
      id: video.id,
      position: index
    }));
    
    const result = await updateVideoPositions(videoPositions);
    
    if (!result.success) {
      setError(result.error || 'Error al actualizar las posiciones');
      // Revert to original order by refetching
      await fetchVideos();
    }
  };

  // Filter videos by category for display
  const filteredVideos = activeCategory === 'all' 
    ? videos 
    : videos.filter(video => video.category === activeCategory);

  // Generate embed preview URL
  const getEmbedUrl = (url: string, platform: 'youtube' | 'vimeo' | 'custom') => {
    if (platform === 'youtube') {
      // Extract YouTube video ID
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    } else if (platform === 'vimeo') {
      // Extract Vimeo video ID
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|)(\d+)(?:|\/\?)|player\.vimeo\.com\/video\/(\d+))/);
      if (match && (match[2] || match[3])) {
        const videoId = match[2] || match[3];
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }
    
    // Return original URL if no match found or for custom videos
    return url;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Videos</h2>
        <Select
          onChange={(e) => setActiveCategory(e.target.value)}
          value={activeCategory}
        >
          <option value="all">Todos los videos</option>
          <option value="instructional">Instructivos</option>
          <option value="ley-karin">Ley Karin</option>
          <option value="compliance">Cumplimiento</option>
          <option value="prevention">Prevención</option>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert>
          {success}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{selectedVideo ? 'Editar Video' : 'Agregar Nuevo Video'}</CardTitle>
          <CardDescription>
            {selectedVideo 
              ? 'Actualice la información del video existente' 
              : 'Complete el formulario para agregar un nuevo video'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
              >
                <option value="instructional">Instructivo</option>
                <option value="ley-karin">Ley Karin</option>
                <option value="compliance">Cumplimiento</option>
                <option value="prevention">Prevención</option>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="platform">Plataforma</Label>
              <Select
                id="platform"
                name="platform"
                value={formData.platform}
                onChange={handleInputChange}
                disabled={selectedVideo && videos.find(v => v.id === selectedVideo)?.platform === 'custom'}
                required
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="custom">Video Personalizado</option>
              </Select>
            </div>
            
            {formData.platform !== 'custom' ? (
              <div className="space-y-2">
                <Label htmlFor="videoUrl">URL del Video</Label>
                <Input
                  id="videoUrl"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleInputChange}
                  placeholder={
                    formData.platform === 'youtube'
                      ? 'https://www.youtube.com/watch?v=abcdefghijk'
                      : 'https://vimeo.com/123456789'
                  }
                  required
                />
                {formData.videoUrl && (
                  <div className="mt-4">
                    <Label>Vista previa</Label>
                    <div className="aspect-video mt-2">
                      <iframe
                        src={getEmbedUrl(formData.videoUrl, formData.platform)}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="videoFile">Archivo de Video</Label>
                  <Input
                    id="videoFile"
                    name="videoFile"
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    required={!selectedVideo}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnailFile">Miniatura (Opcional)</Label>
                  <Input
                    id="thumbnailFile"
                    name="thumbnailFile"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              type="button"
              onClick={resetForm}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? 'Procesando...' 
                : selectedVideo 
                  ? 'Actualizar Video' 
                  : 'Agregar Video'
              }
            </Button>
          </CardFooter>
        </form>
      </Card>

      <h3 className="text-xl font-semibold mt-8">Videos Disponibles</h3>
      
      {filteredVideos.length === 0 ? (
        <p className="text-gray-500">No hay videos disponibles en esta categoría.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filteredVideos.map((video, index) => (
            <Card 
              key={video.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`${draggingIndex === index ? 'border-blue-500' : ''} cursor-move`}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-lg">{video.title}</CardTitle>
                <CardDescription>
                  {video.description?.substring(0, 100)}
                  {video.description && video.description.length > 100 ? '...' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="aspect-video mb-2">
                  <iframe
                    src={getEmbedUrl(video.videoUrl, video.platform)}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1">
                    {video.platform === 'youtube' 
                      ? 'YouTube' 
                      : video.platform === 'vimeo' 
                        ? 'Vimeo' 
                        : 'Video Personalizado'}
                  </span>
                  <span className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-1">
                    {video.category === 'instructional' 
                      ? 'Instructivo' 
                      : video.category === 'ley-karin' 
                        ? 'Ley Karin' 
                        : video.category === 'compliance' 
                          ? 'Cumplimiento' 
                          : 'Prevención'}
                  </span>
                  <span className={`text-xs ${video.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} rounded-full px-2 py-1`}>
                    {video.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between">
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(video)}
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleToggleStatus(video.id, video.isActive)}
                  >
                    {video.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleDelete(video.id)}
                >
                  Eliminar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}