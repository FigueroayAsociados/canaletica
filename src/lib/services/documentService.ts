// src/lib/services/documentService.ts
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, Timestamp, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '@/lib/firebase/config';

// Interfaz para documentos de la compañía
export interface CompanyDocument {
  id?: string;
  title: string;
  description?: string;
  fileURL: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  isPublic: boolean;
  documentType?: 'standard' | 'legal' | 'terms' | 'privacy'; // Nuevo campo para categorizar documentos
}

/**
 * Sube un documento a Firebase Storage y guarda sus metadatos en Firestore
 */
export async function uploadCompanyDocument(
  companyId: string, 
  file: File, 
  metadata: { 
    title: string; 
    description?: string;
    isPublic?: boolean;
    documentType?: 'standard' | 'legal' | 'terms' | 'privacy';
  }
): Promise<CompanyDocument> {
  console.log("Iniciando carga de documento para compañía:", companyId);
  console.log("Metadata:", metadata);
  console.log("Archivo:", file.name, file.type, file.size);
  
  // Crear una ruta única para el archivo
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const filePath = `companies/${companyId}/documents/${fileName}`;
  
  try {
    // 1. Subir archivo a Storage
    const storage = getStorage(app);
    const storageRef = ref(storage, filePath);
    
    // Intento de carga con manejo de errores específico
    let uploadResult;
    try {
      uploadResult = await uploadBytes(storageRef, file);
      console.log('Archivo subido exitosamente a Storage:', uploadResult);
    } catch (storageError) {
      console.error('Error específico al subir a Storage:', storageError);
      throw new Error(`Error de Storage: ${storageError.message}`);
    }
    
    // 2. Obtener URL de descarga
    let downloadURL;
    try {
      downloadURL = await getDownloadURL(uploadResult.ref);
      console.log('URL de descarga obtenida:', downloadURL);
    } catch (urlError) {
      console.error('Error al obtener URL de descarga:', urlError);
      throw new Error(`Error al obtener URL: ${urlError.message}`);
    }
    
    // 3. Guardar metadatos en Firestore
    const db = getFirestore(app);
    const now = new Date();
    
    const documentData: Omit<CompanyDocument, 'id'> = {
      title: metadata.title,
      description: metadata.description || '',
      fileURL: downloadURL,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      createdAt: now,
      updatedAt: now,
      isPublic: metadata.isPublic || false,
      documentType: metadata.documentType || 'standard'
    };
    
    let docRef;
    try {
      docRef = await addDoc(collection(db, `companies/${companyId}/documents`), documentData);
      console.log('Metadatos guardados en Firestore:', docRef.id);
    } catch (firestoreError) {
      console.error('Error al guardar en Firestore:', firestoreError);
      // Intentamos eliminar el archivo de Storage si falló el registro en Firestore
      try {
        await deleteObject(storageRef);
        console.log('Archivo eliminado de Storage después de error en Firestore');
      } catch (deleteError) {
        console.error('Error al eliminar archivo de Storage:', deleteError);
      }
      
      // Preparamos un mensaje de error detallado
      const errorMessage = firestoreError instanceof Error 
        ? firestoreError.message
        : 'Error desconocido al guardar en Firestore';
      
      console.error(`Error detallado de Firestore: ${errorMessage}`, firestoreError);
      throw new Error(`Error de Firestore: ${errorMessage}`);
    }
    
    return {
      id: docRef.id,
      ...documentData
    };
  } catch (error) {
    console.error('Error al subir documento:', error);
    throw error;
  }
}

/**
 * Obtiene todos los documentos de una compañía
 */
export async function getCompanyDocuments(companyId: string): Promise<CompanyDocument[]> {
  try {
    const db = getFirestore(app);
    const q = query(
      collection(db, `companies/${companyId}/documents`),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const documents: CompanyDocument[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      documents.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp 
          ? data.createdAt.toDate() 
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp 
          ? data.updatedAt.toDate() 
          : data.updatedAt
      } as CompanyDocument);
    });
    
    return documents;
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    throw error;
  }
}

/**
 * Obtiene solo los documentos públicos de una compañía
 */
export async function getPublicCompanyDocuments(companyId: string): Promise<CompanyDocument[]> {
  try {
    const db = getFirestore(app);
    const q = query(
      collection(db, `companies/${companyId}/documents`),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const documents: CompanyDocument[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      documents.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp 
          ? data.createdAt.toDate() 
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp 
          ? data.updatedAt.toDate() 
          : data.updatedAt
      } as CompanyDocument);
    });
    
    console.log(`Documentos públicos encontrados para compañía ${companyId}:`, documents.length);
    return documents;
  } catch (error) {
    console.error('Error al obtener documentos públicos:', error);
    throw error;
  }
}

/**
 * Obtiene documentos legales específicos (términos y condiciones, política de privacidad)
 */
export async function getLegalDocuments(companyId: string, type?: 'terms' | 'privacy'): Promise<CompanyDocument[]> {
  try {
    const db = getFirestore(app);
    
    // Crear la consulta base con filtro isPublic=true
    let baseQuery = query(
      collection(db, `companies/${companyId}/documents`),
      where('isPublic', '==', true)
    );
    
    // Si se especifica un tipo, agregar ese filtro
    if (type) {
      baseQuery = query(
        collection(db, `companies/${companyId}/documents`),
        where('isPublic', '==', true),
        where('documentType', '==', type)
      );
    } else {
      // Si no se especifica, buscar documentos marcados como legales, términos o privacidad
      baseQuery = query(
        collection(db, `companies/${companyId}/documents`),
        where('isPublic', '==', true),
        where('documentType', 'in', ['legal', 'terms', 'privacy'])
      );
    }
    
    const querySnapshot = await getDocs(baseQuery);
    const documents: CompanyDocument[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      documents.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp 
          ? data.createdAt.toDate() 
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp 
          ? data.updatedAt.toDate() 
          : data.updatedAt
      } as CompanyDocument);
    });
    
    return documents;
  } catch (error) {
    console.error('Error al obtener documentos legales:', error);
    return [];
  }
}

/**
 * Obtiene el documento de términos y condiciones más reciente
 */
export async function getTermsDocument(companyId: string): Promise<CompanyDocument | null> {
  try {
    const documents = await getLegalDocuments(companyId, 'terms');
    
    // Ordenar por fecha de creación descendente y devolver el primero
    const sortedDocs = documents.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt.seconds * 1000);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt.seconds * 1000);
      return dateB.getTime() - dateA.getTime();
    });
    
    return sortedDocs.length > 0 ? sortedDocs[0] : null;
  } catch (error) {
    console.error('Error al obtener documento de términos:', error);
    return null;
  }
}

/**
 * Obtiene el documento de política de privacidad más reciente
 */
export async function getPrivacyDocument(companyId: string): Promise<CompanyDocument | null> {
  try {
    const documents = await getLegalDocuments(companyId, 'privacy');
    
    // Ordenar por fecha de creación descendente y devolver el primero
    const sortedDocs = documents.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt.seconds * 1000);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt.seconds * 1000);
      return dateB.getTime() - dateA.getTime();
    });
    
    return sortedDocs.length > 0 ? sortedDocs[0] : null;
  } catch (error) {
    console.error('Error al obtener documento de privacidad:', error);
    return null;
  }
}

/**
 * Actualiza un documento existente
 */
export async function updateCompanyDocument(
  companyId: string,
  documentId: string,
  updates: Partial<CompanyDocument>
): Promise<void> {
  try {
    const db = getFirestore(app);
    const docRef = doc(db, `companies/${companyId}/documents/${documentId}`);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    throw error;
  }
}

/**
 * Elimina un documento (tanto de Firestore como de Storage)
 */
export async function deleteCompanyDocument(
  companyId: string,
  documentId: string,
  fileName: string
): Promise<void> {
  try {
    // 1. Eliminar referencia de Firestore
    const db = getFirestore(app);
    const docRef = doc(db, `companies/${companyId}/documents/${documentId}`);
    await deleteDoc(docRef);
    
    // 2. Eliminar archivo de Storage
    const storage = getStorage(app);
    const fileRef = ref(storage, `companies/${companyId}/documents/${fileName}`);
    
    try {
      await deleteObject(fileRef);
    } catch (storageError) {
      console.error('Error al eliminar archivo de Storage:', storageError);
      // No propagamos este error ya que los metadatos ya fueron eliminados
    }
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    throw error;
  }
}

/**
 * Función para subir un documento público de demostración
 * Útil para verificar la funcionalidad de documentos públicos en la página principal
 */
export async function uploadDemoPublicDocument(companyId: string): Promise<CompanyDocument | null> {
  try {
    // Crear un documento de texto simple como ejemplo
    const content = 'Este es un documento de ejemplo para la demostración de documentos públicos.';
    const file = new File([content], 'documento_ejemplo.txt', { type: 'text/plain' });
    
    // Subir el documento como público
    const document = await uploadCompanyDocument(companyId, file, {
      title: 'Documento de Demostración',
      description: 'Este es un documento público para verificar la funcionalidad de documentos en la página principal.',
      isPublic: true
    });
    
    console.log('Documento público de demostración creado:', document);
    return document;
  } catch (error) {
    console.error('Error al crear documento de demostración:', error);
    return null;
  }
}

/**
 * Guarda contenido HTML o texto como documento legal en Firestore
 */
export async function saveLegalDocument(
  companyId: string,
  content: string,
  type: 'terms' | 'privacy',
  title: string
): Promise<string | null> {
  try {
    // Convertir contenido a archivo
    const file = new File([content], `${type}_document.html`, { type: 'text/html' });
    
    // Subir como documento
    const document = await uploadCompanyDocument(companyId, file, {
      title: title,
      description: type === 'terms' 
        ? 'Términos y condiciones del sistema'
        : 'Política de privacidad y protección de datos',
      isPublic: true,
      documentType: type
    });
    
    return document.id || null;
  } catch (error) {
    console.error(`Error al guardar documento ${type}:`, error);
    return null;
  }
}

/**
 * Guarda términos y condiciones como documento en la colección
 */
export async function saveTermsAndConditions(
  companyId: string,
  termsContent: string,
  title = 'Términos y Condiciones del Canal de Denuncias'
): Promise<string | null> {
  return saveLegalDocument(companyId, termsContent, 'terms', title);
}

/**
 * Guarda política de privacidad como documento en la colección
 */
export async function savePrivacyPolicy(
  companyId: string,
  privacyContent: string,
  title = 'Política de Privacidad y Tratamiento de Datos Personales'
): Promise<string | null> {
  return saveLegalDocument(companyId, privacyContent, 'privacy', title);
}

/**
 * Función alternativa para crear un documento directamente en la colección publicDocuments
 */
export async function createDirectPublicDocument(companyId: string): Promise<string | null> {
  try {
    const db = getFirestore(app);
    const now = new Date();
    
    // Crear un documento en la colección publicDocuments
    const docRef = await addDoc(collection(db, `companies/${companyId}/publicDocuments`), {
      title: 'Documento Público Directo',
      description: 'Creado directamente en la colección publicDocuments para pruebas',
      fileURL: 'https://example.com/documento-ejemplo.pdf',
      fileName: 'documento-ejemplo.pdf',
      fileType: 'application/pdf',
      fileSize: 12345,
      createdAt: now,
      updatedAt: now,
      isPublic: true
    });
    
    console.log('Documento público directo creado:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error al crear documento público directo:', error);
    return null;
  }
}