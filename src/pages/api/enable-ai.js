// src/pages/api/enable-ai.js
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { companyId = 'mvc' } = req.body;

  try {
    console.log(`🚀 Activando feature flags de IA para ${companyId}...`);
    
    const flagsRef = doc(db, `companies/${companyId}/settings/features`);
    
    const featureFlags = {
      modulesEnabled: true,
      aiEnabled: true,
      conversationalAssistantEnabled: true,
      karinModuleEnabled: true,
      mpdModuleEnabled: false,
      cyberModuleEnabled: false,
      dataModuleEnabled: false,
      publicAdminModuleEnabled: false,
      newUiEnabled: false,
      dashboardV2Enabled: false,
      emailNotificationsEnabled: true,
      riskAnalysisEnabled: true,
      aiInsightsEnabled: true,
      smartAlertsEnabled: true,
      updatedAt: new Date(),
      updatedBy: 'api'
    };
    
    await setDoc(flagsRef, featureFlags, { merge: true });
    
    console.log('✅ Feature flags de IA activados');
    
    res.status(200).json({ 
      success: true, 
      message: 'Feature flags de IA activados correctamente',
      flags: featureFlags
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
}