// src/lib/services/setupService.ts

import { 
    doc, 
    collection, 
    setDoc, 
    addDoc, 
    serverTimestamp 
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase/config';
  
  /**
   * Inicializa una nueva empresa con datos predeterminados
   * @param companyId ID de la empresa
   * @param companyName Nombre de la empresa
   * @param adminEmail Correo del administrador principal
   */
  export async function initializeNewCompany(
    companyId: string, 
    companyName: string,
    adminEmail: string
  ) {
    try {
      // 1. Configuración general
      await setDoc(doc(db, `companies/${companyId}/settings/general`), {
        companyName,
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        emailNotifications: true,
        defaultLanguage: 'es',
        retentionPolicy: 365,
        slaForRegular: 30,
        slaForKarin: 10,
        notifications: {
          notifyNewReport: true,
          notifyStatusChange: true,
          notifyNewComment: true,
          notifyDueDate: true
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
  
      // 2. Roles predeterminados
      const adminRole = {
        name: 'Administrador',
        description: 'Acceso completo al sistema',
        permissions: [
          'reports.view', 'reports.create', 'reports.edit', 'reports.assign', 'reports.change_status',
          'investigations.view', 'investigations.manage',
          'communications.view', 'communications.reply',
          'recommendations.view', 'recommendations.manage',
          'follow_up.view', 'follow_up.update',
          'users.view', 'users.manage',
          'settings.view', 'settings.manage',
          'statistics.view', 'exports.generate'
        ],
        isSystemRole: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
  
      const investigatorRole = {
        name: 'Investigador',
        description: 'Puede investigar denuncias asignadas',
        permissions: [
          'reports.view',
          'investigations.view', 'investigations.manage',
          'communications.view', 'communications.reply',
          'recommendations.view', 'recommendations.manage',
          'follow_up.view', 'follow_up.update',
          'statistics.view'
        ],
        isSystemRole: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
  
      await setDoc(doc(db, `companies/${companyId}/roles/admin`), adminRole);
      await setDoc(doc(db, `companies/${companyId}/roles/investigator`), investigatorRole);
  
      // 3. Categorías predeterminadas
      const defaultCategories = [
        {
          name: 'Modelo de Prevención de Delitos',
          description: 'Categoría para denuncias relacionadas con la Ley 20.393',
          isActive: true,
          order: 0,
          isKarinLaw: false,
          id: 'modelo_prevencion'
        },
        {
          name: 'Ley Karin',
          description: 'Denuncias de acoso laboral y sexual según Ley Karin',
          isActive: true,
          order: 1,
          isKarinLaw: true,
          id: 'ley_karin',
          requiresSpecialProcess: true
        },
        {
          name: 'Ciberseguridad',
          description: 'Vulneraciones o incidentes de seguridad informática',
          isActive: true,
          order: 2,
          isKarinLaw: false
        },
        {
          name: 'Reglamento Interno',
          description: 'Infracciones al reglamento interno de la organización',
          isActive: true,
          order: 3,
          isKarinLaw: false
        },
        {
          name: 'Políticas y Códigos',
          description: 'Incumplimientos del código de ética y otras políticas',
          isActive: true,
          order: 4,
          isKarinLaw: false
        }
      ];
  
      // Crear categorías
      for (const category of defaultCategories) {
        const categoryRef = await addDoc(collection(db, `companies/${companyId}/categories`), {
          ...category,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
  
        // Añadir subcategorías para cada categoría
        if (category.name === 'Modelo de Prevención de Delitos') {
          const subcategories = [
            { name: 'Cohecho', description: 'Soborno a funcionario público', isActive: true, order: 0 },
            { name: 'Lavado de activos', description: 'Ocultamiento de dinero obtenido ilegalmente', isActive: true, order: 1 },
            { name: 'Financiamiento del terrorismo', description: 'Provisión de recursos para terrorismo', isActive: true, order: 2 }
          ];
          
          for (const subcat of subcategories) {
            await addDoc(collection(db, `companies/${companyId}/subcategories`), {
              ...subcat,
              categoryId: categoryRef.id,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        } else if (category.name === 'Ley Karin') {
          const subcategories = [
            { name: 'Acoso laboral', description: 'Conductas que constituyen agresión u hostigamiento laboral', isActive: true, order: 0 },
            { name: 'Acoso sexual', description: 'Conductas de naturaleza sexual no consentidas', isActive: true, order: 1 },
            { name: 'Violencia en el trabajo', description: 'Agresiones físicas o psicológicas en el entorno laboral', isActive: true, order: 2 }
          ];
          
          for (const subcat of subcategories) {
            await addDoc(collection(db, `companies/${companyId}/subcategories`), {
              ...subcat,
              categoryId: categoryRef.id,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        }
      }
  
      // 4. Plantillas de mensajes predeterminadas
      const emailTemplates = [
        {
          name: 'Confirmación de denuncia',
          subject: 'Su denuncia ha sido registrada exitosamente',
          content: `
  <p>Su denuncia ha sido registrada exitosamente en nuestro sistema.</p>
  <p>Código de seguimiento: <strong>{{codigo}}</strong></p>
  <p>Recuerde guardar este código para consultar el estado de su denuncia.</p>
  <p>Gracias por ayudarnos a mantener la transparencia y ética en nuestra organización.</p>
          `,
          type: 'report_created',
          isActive: true
        },
        {
          name: 'Notificación de investigador asignado',
          subject: 'Nueva denuncia asignada',
          content: `
  <p>Se le ha asignado una nueva denuncia para investigación:</p>
  <ul>
  <li>Código: <strong>{{codigo}}</strong></li>
  <li>Categoría: {{categoria}}</li>
  </ul>
  <p>Por favor, revise la denuncia y comience el proceso de investigación a la brevedad.</p>
          `,
          type: 'report_assigned',
          isActive: true
        },
        {
          name: 'Recordatorio de recomendación',
          subject: 'Recordatorio: Recomendación próxima a vencer',
          content: `
  <p>Le recordamos que tiene una recomendación próxima a vencer:</p>
  <ul>
  <li>Recomendación: {{accion}}</li>
  <li>Código de denuncia: {{codigo}}</li>
  <li>Fecha límite: <strong>{{fecha}}</strong> ({{dias}} días restantes)</li>
  </ul>
  <p>Por favor, complete la implementación de esta recomendación antes de la fecha límite.</p>
          `,
          type: 'recommendation_due',
          isActive: true
        },
        {
          name: 'Denuncia cerrada',
          subject: 'Su denuncia ha sido cerrada',
          content: `
  <p>Le informamos que su denuncia con código <strong>{{codigo}}</strong> ha sido cerrada.</p>
  <p>Agradecemos su contribución a mantener un ambiente ético y transparente en nuestra organización.</p>
  <p>Si tiene alguna consulta adicional, puede utilizar el código de seguimiento para contactarnos a través del sistema.</p>
          `,
          type: 'report_closed',
          isActive: true
        }
      ];
  
      for (const template of emailTemplates) {
        await addDoc(collection(db, `companies/${companyId}/messageTemplates`), {
          ...template,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
  
      // 5. Estadísticas iniciales
      await setDoc(doc(db, `companies/${companyId}/stats/reports`), {
        totalReports: 0,
        byStatus: {},
        byCategory: {},
        updated: serverTimestamp()
      });
  
      // 6. Crear usuario administrador (si se proporciona correo)
      if (adminEmail) {
        // El ID de usuario se generaría al crear la cuenta de autenticación
        // Esto es solo un placeholder para la estructura de datos
        await setDoc(doc(db, `companies/${companyId}/users/admin_placeholder`), {
          email: adminEmail,
          displayName: 'Administrador',
          role: 'admin',
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
  
      return { success: true };
    } catch (error) {
      console.error('Error al inicializar empresa:', error);
      return {
        success: false,
        error: 'Error al inicializar la empresa: ' + error.message
      };
    }
  }
  
  /**
   * Función para usar en la consola o desde una herramienta administrativa
   * para crear una nueva empresa en el sistema.
   */
  export async function setupNewCompany(
    companyName: string,
    adminEmail: string,
    industry?: string,
    description?: string,
    maxUsers: number = 10
  ) {
    try {
      // Generar ID de empresa a partir del nombre (slugify)
      const companyId = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Crear documento de empresa
      await setDoc(doc(db, `companies/${companyId}`), {
        name: companyName,
        isActive: true,
        contactEmail: adminEmail,
        description: description || '',
        industry: industry || '',
        maxUsers: maxUsers,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Inicializar la empresa con datos predeterminados
      const result = await initializeNewCompany(companyId, companyName, adminEmail);
      
      if (result.success) {
        return {
          success: true,
          companyId,
          message: `Empresa "${companyName}" creada con éxito con ID: ${companyId}`
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Error en setupNewCompany:', error);
      return {
        success: false,
        error: 'Error al configurar nueva empresa: ' + error.message
      };
    }
  }

/**
 * Verifica y actualiza la categoría de Ley Karin y sus subcategorías si no existen
 * @param companyId ID de la empresa
 */
/**
 * Restaura todas las categorías para la empresa, incluyendo Ley Karin y las personalizadas
 * @param companyId ID de la empresa
 */
export async function restoreAllCategories(companyId: string) {
  try {
    const { collection, getDocs, addDoc, deleteDoc, doc, query, where, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase/config');
    
    // 1. Identificar categorías existentes
    const categoriesRef = collection(db, `companies/${companyId}/categories`);
    const categoriesSnapshot = await getDocs(categoriesRef);
    
    // Mapeo de IDs lógicos a IDs de Firestore
    const existingCategoryMap = {};
    const categoriesToDelete = [];
    
    // Identificar categorías duplicadas o que necesitan actualizarse
    for (const doc of categoriesSnapshot.docs) {
      const categoryData = doc.data();
      const logicalId = categoryData.id; // ID lógico (como 'ley_karin', 'medioambiente')
      
      if (!logicalId) {
        // Categoría sin ID lógico, eliminar
        categoriesToDelete.push(doc.ref);
      } else if (existingCategoryMap[logicalId]) {
        // Categoría duplicada, eliminar
        console.log(`Categoría duplicada encontrada: ${logicalId}. Eliminando...`);
        categoriesToDelete.push(doc.ref);
      } else {
        // Categoría única, mantener referencia
        existingCategoryMap[logicalId] = doc.id; // Guardar ID de Firestore
      }
    }
    
    // Eliminar categorías duplicadas
    console.log(`Eliminando ${categoriesToDelete.length} categorías duplicadas o inválidas...`);
    for (const docRef of categoriesToDelete) {
      await deleteDoc(docRef);
    }
    
    // 2. Limpiar subcategorías huérfanas o duplicadas
    const subcategoriesRef = collection(db, `companies/${companyId}/subcategories`);
    const subcategoriesSnapshot = await getDocs(subcategoriesRef);
    
    // Rastrear subcategorías por categoría para identificar duplicados
    const subcatsByCategoryId = {};
    const subcatsToDelete = [];
    
    for (const doc of subcategoriesSnapshot.docs) {
      const subcatData = doc.data();
      const categoryId = subcatData.categoryId;
      const subcatId = subcatData.id;
      
      if (!categoryId || !subcatId) {
        // Subcategoría sin categoría o sin ID, eliminar
        subcatsToDelete.push(doc.ref);
        continue;
      }
      
      // Verificar si la categoría padre existe
      const categoryExists = Object.values(existingCategoryMap).includes(categoryId);
      if (!categoryExists) {
        // Categoría padre no existe, eliminar subcategoría
        subcatsToDelete.push(doc.ref);
        continue;
      }
      
      // Rastrear para detectar duplicados
      const key = `${categoryId}_${subcatId}`;
      if (subcatsByCategoryId[key]) {
        // Subcategoría duplicada, eliminar
        subcatsToDelete.push(doc.ref);
      } else {
        subcatsByCategoryId[key] = doc.id;
      }
    }
    
    console.log(`Eliminando ${subcatsToDelete.length} subcategorías duplicadas o huérfanas...`);
    for (const docRef of subcatsToDelete) {
      await deleteDoc(docRef);
    }
    
    // 3. Crear o actualizar categorías necesarias
    const categories = [
      {
        name: 'Medioambiente',
        description: 'Denuncias relacionadas con temas ambientales o ecológicos',
        isActive: true,
        order: 0,
        isKarinLaw: false,
        id: 'medioambiente'
      },
      {
        name: 'Ley Karin',
        description: 'Denuncias de acoso laboral y sexual según Ley Karin',
        isActive: true,
        order: 1,
        isKarinLaw: true,
        id: 'ley_karin',
        requiresSpecialProcess: true
      },
      {
        name: 'Modelo de Prevención de Delitos',
        description: 'Categoría para denuncias relacionadas con la Ley 20.393',
        isActive: true,
        order: 2,
        isKarinLaw: false,
        id: 'modelo_prevencion'
      }
    ];
    
    console.log('Actualizando o creando categorías...');
    
    const categoryIds = { ...existingCategoryMap }; // Copiar las existentes
    const { updateDoc } = await import('firebase/firestore');
    
    // Crear o actualizar cada categoría
    for (const category of categories) {
      const logicalId = category.id;
      
      if (existingCategoryMap[logicalId]) {
        // La categoría ya existe, actualizarla
        const docId = existingCategoryMap[logicalId];
        const docRef = doc(db, `companies/${companyId}/categories/${docId}`);
        
        console.log(`Actualizando categoría existente: ${category.name} (${logicalId})`);
        await updateDoc(docRef, {
          ...category,
          updatedAt: serverTimestamp()
        });
        
        categoryIds[logicalId] = docId;
      } else {
        // La categoría no existe, crearla
        console.log(`Creando nueva categoría: ${category.name} (${logicalId})`);
        const newCategoryRef = await addDoc(categoriesRef, {
          ...category,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        categoryIds[logicalId] = newCategoryRef.id;
      }
    }
    
    // 4. Crear subcategorías para cada categoría
    const subcategoriesMap = {
      'medioambiente': [
        { 
          name: 'Contaminación', 
          description: 'Problemas de contaminación ambiental', 
          isActive: true, 
          order: 0,
          id: 'contaminacion'
        },
        { 
          name: 'Mal manejo de residuos', 
          description: 'Manejo inadecuado de residuos o desechos', 
          isActive: true, 
          order: 1,
          id: 'residuos'
        }
      ],
      'ley_karin': [
        { 
          name: 'Acoso laboral', 
          description: 'Conductas que constituyen agresión u hostigamiento laboral', 
          isActive: true, 
          order: 0,
          id: 'acoso_laboral'
        },
        { 
          name: 'Acoso sexual', 
          description: 'Conductas de naturaleza sexual no consentidas', 
          isActive: true, 
          order: 1,
          id: 'acoso_sexual'
        },
        { 
          name: 'Violencia en el trabajo', 
          description: 'Agresiones físicas o psicológicas en el entorno laboral', 
          isActive: true, 
          order: 2,
          id: 'violencia_trabajo'
        }
      ],
      'modelo_prevencion': [
        { 
          name: 'Cohecho', 
          description: 'Soborno a funcionario público', 
          isActive: true, 
          order: 0,
          id: 'cohecho'
        },
        { 
          name: 'Lavado de activos', 
          description: 'Ocultamiento de dinero obtenido ilegalmente', 
          isActive: true, 
          order: 1,
          id: 'lavado_activos'
        }
      ]
    };
    
    // Crear subcategorías para cada categoría
    for (const [categoryId, subcategories] of Object.entries(subcategoriesMap)) {
      if (categoryIds[categoryId]) {
        console.log(`Procesando ${subcategories.length} subcategorías para ${categoryId}...`);
        
        // Verificar si ya existen subcategorías para esta categoría
        const firestoreCategoryId = categoryIds[categoryId];
        const existingSubcatsQuery = query(subcategoriesRef, where('categoryId', '==', firestoreCategoryId));
        const existingSubcatsSnapshot = await getDocs(existingSubcatsQuery);
        
        // Mapear las subcategorías existentes por su ID lógico
        const existingSubcatMap = {};
        existingSubcatsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.id) {
            existingSubcatMap[data.id] = {
              docId: doc.id,
              data: data
            };
          }
        });
        
        // Crear o actualizar cada subcategoría
        for (const subcat of subcategories) {
          const subcatId = subcat.id;
          
          if (existingSubcatMap[subcatId]) {
            // La subcategoría ya existe, actualizarla
            const docId = existingSubcatMap[subcatId].docId;
            const docRef = doc(db, `companies/${companyId}/subcategories/${docId}`);
            
            console.log(`Actualizando subcategoría existente: ${subcat.name} (${subcatId})`);
            await updateDoc(docRef, {
              ...subcat,
              categoryId: firestoreCategoryId,
              updatedAt: serverTimestamp()
            });
          } else {
            // La subcategoría no existe, crearla
            console.log(`Creando nueva subcategoría: ${subcat.name} (${subcatId})`);
            await addDoc(subcategoriesRef, {
              ...subcat,
              categoryId: firestoreCategoryId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        }
      }
    }
    
    return {
      success: true,
      message: 'Todas las categorías restauradas correctamente',
      categoryIds
    };
  } catch (error) {
    console.error('Error al restaurar categorías:', error);
    return {
      success: false,
      error: 'Error al restaurar categorías'
    };
  }
}

export async function ensureKarinCategoryExists(companyId: string) {
  try {
    // Restaurar todas las categorías es más seguro que intentar arreglar solo Ley Karin
    return await restoreAllCategories(companyId);
  } catch (error) {
    console.error('Error al verificar categoría Ley Karin:', error);
    return {
      success: false,
      error: 'Error al verificar categoría Ley Karin'
    };
  }
}

/**
 * Inicializa o actualiza los tipos de impacto para los formularios de denuncia
 * @param companyId ID de la empresa (por defecto 'default')
 */
export async function initializeImpactTypes(companyId: string = 'default') {
  try {
    const { collection, addDoc, getDocs, doc, getDoc, query, where, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase/config');

    // Verificar si ya existen tipos de impacto
    const impactsPath = `companies/${companyId}/formOptions/impacts/values`;
    const impactsRef = collection(db, impactsPath);
    const impactsSnapshot = await getDocs(impactsRef);
    
    // Si ya existen, no hacemos nada
    if (!impactsSnapshot.empty) {
      console.log('Los tipos de impacto ya están definidos.');
      return {
        success: true,
        message: 'Los tipos de impacto ya están definidos',
        count: impactsSnapshot.size
      };
    }
    
    console.log('Inicializando tipos de impacto...');
    
    // Definir los tipos de impacto predeterminados
    const defaultImpacts = [
      { name: 'Económico', value: 'economico', description: 'Impacto en finanzas o recursos económicos', isActive: true, order: 0 },
      { name: 'Laboral', value: 'laboral', description: 'Afectación del ambiente o desempeño laboral', isActive: true, order: 1 },
      { name: 'Personal', value: 'personal', description: 'Impacto en la salud física o mental', isActive: true, order: 2 },
      { name: 'Reputacional', value: 'reputacional', description: 'Afectación a la imagen o reputación', isActive: true, order: 3 },
      { name: 'Operacional', value: 'operacional', description: 'Impacto en las operaciones del negocio', isActive: true, order: 4 },
      { name: 'Legal', value: 'legal', description: 'Consecuencias legales para la organización', isActive: true, order: 5 },
      { name: 'Otro', value: 'otro', description: 'Otro tipo de impacto no especificado', isActive: true, order: 6 }
    ];
    
    // Crear los tipos de impacto
    for (const impact of defaultImpacts) {
      await addDoc(impactsRef, {
        ...impact,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    return {
      success: true,
      message: `Se han inicializado ${defaultImpacts.length} tipos de impacto`,
      count: defaultImpacts.length
    };
  } catch (error) {
    console.error('Error al inicializar tipos de impacto:', error);
    return {
      success: false,
      error: 'Error al inicializar tipos de impacto'
    };
  }
}

/**
 * Inicializa o actualiza los canales de denuncia para los formularios
 * @param companyId ID de la empresa (por defecto 'default')
 */
export async function initializeReportingChannels(companyId: string = 'default') {
  try {
    const { collection, addDoc, getDocs, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase/config');

    // Verificar si ya existen canales de denuncia
    const channelsPath = `companies/${companyId}/formOptions/channels/values`;
    const channelsRef = collection(db, channelsPath);
    const channelsSnapshot = await getDocs(channelsRef);
    
    // Si ya existen, no hacemos nada
    if (!channelsSnapshot.empty) {
      console.log('Los canales de denuncia ya están definidos.');
      return {
        success: true,
        message: 'Los canales de denuncia ya están definidos',
        count: channelsSnapshot.size
      };
    }
    
    console.log('Inicializando canales de denuncia...');
    
    // Definir los canales de denuncia predeterminados
    const defaultChannels = [
      { name: 'Verbal (presencial)', value: 'verbal', description: 'Denuncia realizada presencialmente', isActive: true, order: 0 },
      { name: 'Escrita (documento)', value: 'escrita', description: 'Denuncia presentada por documento escrito', isActive: true, order: 1 },
      { name: 'Correo electrónico', value: 'email', description: 'Denuncia recibida por correo electrónico', isActive: true, order: 2 },
      { name: 'A través de jefatura', value: 'jefe', description: 'Denuncia presentada a través de un superior jerárquico', isActive: true, order: 3 },
      { name: 'Canal web', value: 'web', description: 'Denuncia enviada a través del formulario web', isActive: true, order: 4 },
      { name: 'Teléfono', value: 'telefono', description: 'Denuncia recibida por vía telefónica', isActive: true, order: 5 },
      { name: 'Otro', value: 'otro', description: 'Otro canal de denuncia no especificado', isActive: true, order: 6 }
    ];
    
    // Crear los canales de denuncia
    for (const channel of defaultChannels) {
      await addDoc(channelsRef, {
        ...channel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    return {
      success: true,
      message: `Se han inicializado ${defaultChannels.length} canales de denuncia`,
      count: defaultChannels.length
    };
  } catch (error) {
    console.error('Error al inicializar canales de denuncia:', error);
    return {
      success: false,
      error: 'Error al inicializar canales de denuncia'
    };
  }
}