import { NextRequest, NextResponse } from 'next/server';
import { getVideos, getVideoById } from '@/lib/services/videoService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('id');
    const category = searchParams.get('category');
    const companyId = searchParams.get('companyId');
    
    // If an ID is provided, get a specific video
    if (videoId) {
      const result = await getVideoById(videoId);
      return NextResponse.json(result);
    }
    
    // Otherwise, get videos based on category and companyId
    const result = await getVideos(
      category || undefined, 
      companyId || undefined
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in videos API route:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar la solicitud de videos' },
      { status: 500 }
    );
  }
}