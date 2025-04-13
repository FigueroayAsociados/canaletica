// src/lib/services/documentService.ts

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';

export interface CompanyDocument {
  id?: string;
  title: string;
  description: string;
  fileURL: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  isPublic: boolean;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Sube un documento corporativo a Firebase Storage y guarda sus metadatos en Firestore
 */
export async function uploadCompanyDocument(
  companyId: string,
  file: File,
  documentData: {
    title: string;
    description: string;
    isPublic: boolean;
  }
) {
  try {
    // Generar una ruta única para el archivo
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `companies/${companyId}/documents/${fileName}`;
    
    // Subir el archivo a Firebase Storage
    const storageRef = ref(storage, filePath);
    const uploadResult = await uploadBytes(storageRef, file);
    
    // Obtener la URL de descarga
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    // Guardar los metadatos en Firestore
    const docRef = await addDoc(
      collection(db, `companies/${companyId}/documents`),
      {
        title: documentData.title,
        description: documentData.description,
        fileURL: downloadURL,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        isPublic: documentData.isPublic,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );
    
    return {
      success: true,
      documentId: docRef.id,
      fileURL: downloadURL,
    };
  } catch (error) {
    console.error('Error al subir documento:', error);
    return {
      success: false,
      error: 'Error al subir el documento',
    };
  }
}

/**
 * Obtiene todos los documentos corporativos de una empresa
 */
export async function getCompanyDocuments(companyId: string) {
  try {
    const documentsRef = collection(db, `companies/${companyId}/documents`);
    const q = query(documentsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const documents: CompanyDocument[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data(),
      } as CompanyDocument);
    });
    
    return {
      success: true,
      documents,
    };
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return {
      success: false,
      error: 'Error al obtener los documentos corporativos',
    };
  }
}

/**
 * Obtiene todos los documentos públicos de una empresa
 */
export async function getPublicCompanyDocuments(companyId: string) {
  try {
    const documentsRef = collection(db, `companies/${companyId}/documents`);
    const q = query(
      documentsRef,
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const documents: CompanyDocument[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data(),
      } as CompanyDocument);
    });
    
    return {
      success: true,
      documents,
    };
  } catch (error) {
    console.error('Error al obtener documentos públicos:', error);
    return {
      success: false,
      error: 'Error al obtener los documentos corporativos',
    };
  }
}

/**
 * Actualiza la información de un documento
 */
export async function updateCompanyDocument(
  companyId: string,
  documentId: string,
  documentData: {
    title: string;
    description: string;
    isPublic: boolean;
  }
) {
  try {
    const docRef = doc(db, `companies/${companyId}/documents/${documentId}`);
    await updateDoc(docRef, {
      title: documentData.title,
      description: documentData.description,
      isPublic: documentData.isPublic,
      updatedAt: serverTimestamp(),
    });
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    return {
      success: false,
      error: 'Error al actualizar el documento',
    };
  }
}

/**
 * Elimina un documento corporativo
 */
export async function deleteCompanyDocument(companyId: string, documentId: string) {
  try {
    // Primero obtenemos los datos del documento para saber la ruta del archivo
    const docRef = doc(db, `companies/${companyId}/documents/${documentId}`);
    const docSnapshot = await getDoc(docRef);
    
    if (!docSnapshot.exists()) {
      return {
        success: false,
        error: 'El documento no existe',
      };
    }
    
    const documentData = docSnapshot.data();
    
    // Eliminar el archivo de Storage
    try {
      const fileURL = documentData.fileURL;
      // Extraer la ruta del archivo de la URL
      const fileRef = ref(storage, fileURL);
      await deleteObject(fileRef);
    } catch (storageError) {
      console.error('Error al eliminar archivo de Storage (continuando):', storageError);
      // Continuamos con la eliminación de Firestore aunque falle Storage
    }
    
    // Eliminar metadatos de Firestore
    await deleteDoc(docRef);
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    return {
      success: false,
      error: 'Error al eliminar el documento',
    };
  }
}