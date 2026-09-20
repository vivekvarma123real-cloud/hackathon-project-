import { InterviewResponse, ClinicalSummary } from '@/types';

const API_BASE = 'http://localhost:8000';

export interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

// ============================================================
// Interview API (State Machine)
// ============================================================

export const submitInterviewAnswer = async (
  sessionLanguage: string,
  currentQuestionId: string,
  latestAnswer: string,
  structuredAnswers: Record<string, string>,
  conversationHistory: ChatMessage[],
  chiefComplaint: string
): Promise<InterviewResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const res = await fetch(`${API_BASE}/api/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionLanguage,
        currentQuestionId,
        latestAnswer,
        structuredAnswers,
        conversationHistory,
        chiefComplaint,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Interview API error (${res.status}): ${errorText}`);
    }

    const data: InterviewResponse = await res.json();
    return data;
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('Interview request timed out. Please try again.');
    }
    throw e;
  }
};

// ============================================================
// Summary API
// ============================================================

export const generateSummaryApi = async (
  sessionLanguage: string,
  structuredAnswers: Record<string, string>,
  conversationHistory: ChatMessage[]
): Promise<ClinicalSummary> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(`${API_BASE}/api/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionLanguage,
        structuredAnswers,
        conversationHistory,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Summary API error (${res.status})`);
    }

    const data = await res.json();
    return data.summary as ClinicalSummary;
  } catch (e: any) {
    clearTimeout(timeoutId);
    console.error('[ClinicalAPI] Summary generation failed:', e);
    // Return a fallback summary from structured answers
    const nr = sessionLanguage === 'hi' ? 'जानकारी नहीं दी गई' : 'Not reported';
    return {
      chiefComplaint: structuredAnswers.chief_complaint || nr,
      location: structuredAnswers.location || nr,
      onset: structuredAnswers.onset || nr,
      duration: structuredAnswers.duration || nr,
      severity: structuredAnswers.severity || nr,
      aggravatingRelievingFactors: structuredAnswers.aggravating_relieving || nr,
      associatedSymptoms: structuredAnswers.associated_symptoms || nr,
      pastMedicalHistory: structuredAnswers.past_history || nr,
      medications: structuredAnswers.medications_allergies || nr,
      allergies: nr,
      additionalInformation: structuredAnswers.additional_information || nr,
    };
  }
};



// ============================================================
// Transcription API
// ============================================================

export interface TranscriptionResult {
  text: string;
  detectedLanguage: string;
}

export const transcribeAudioApi = async (audioBlob: Blob): Promise<TranscriptionResult> => {
  const formData = new FormData();
  let ext = 'webm';
  if (audioBlob.type.includes('mp4')) ext = 'mp4';
  else if (audioBlob.type.includes('ogg')) ext = 'ogg';
  formData.append('file', audioBlob, `audio.${ext}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // Increased to 180s for slow CPU transcription

  try {
    const res = await fetch(`${API_BASE}/api/transcribe`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Transcription API error (${res.status})`);
    }

    const data = await res.json();
    return {
      text: data.text || '',
      detectedLanguage: data.detectedLanguage || 'en',
    };
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('Transcription timed out. Please try again.');
    }
    throw e;
  }
};

// ============================================================
// Health Check API
// ============================================================

export const checkApiHealth = async (): Promise<{ ollama: boolean; whisper: boolean }> => {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
    if (!res.ok) return { ollama: false, whisper: false };
    const data = await res.json();
    return { ollama: data.ollama, whisper: data.whisper };
  } catch {
    return { ollama: false, whisper: false };
  }
};
// ============================================================
// Save Session API
// ============================================================
export const saveSessionApi = async (
  patientIdentity: string,
  sessionLanguage: string,
  chiefComplaint: string,
  structuredAnswers: any,
  summary: any
): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/api/save_session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientIdentity,
        sessionLanguage,
        chiefComplaint,
        structuredAnswers,
        summary
      }),
    });
    if (!res.ok) {
      throw new Error('Failed to save session');
    }
    return await res.json();
  } catch (e) {
    console.error('saveSessionApi error:', e);
    throw e;
  }
};
