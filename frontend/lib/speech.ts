/**
 * Speak text using browser SpeechSynthesis.
 * Cancels any previous speech before starting.
 * Uses en-IN for English, hi-IN for Hindi.
 */
export const speakText = (text: string, lang: string = 'en-IN'): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        // Try to find a matching voice for the requested lang
        const match = voices.find(v => v.lang === lang || v.lang.startsWith(lang.split('-')[0]));
        if (match) utterance.voice = match;
        
        utterance.onend = () => resolve();
        utterance.onerror = (e) => {
          console.warn('[TTS] Speech error:', e);
          resolve();
        };
        
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          setVoiceAndSpeak();
        };
      } else {
        setVoiceAndSpeak();
      }
    } else {
      resolve();
    }
  });
};

/**
 * Get the TTS language code for a session language.
 */
export const getTTSLang = (sessionLanguage: string): string => {
  return sessionLanguage === 'hi' ? 'hi-IN' : 'en-IN';
};

/**
 * Cancel any ongoing TTS speech.
 */
export const cancelSpeech = (): void => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

/**
 * Check if text contains red flag emergency symptoms.
 * Checks both English and Hindi keywords.
 */
export const checkRedFlags = (text: string): boolean => {
  const lower = text.toLowerCase();
  
  const redFlagsEn = [
    'severe chest pain', 'chest tightness', 'difficulty breathing', 
    "can't breathe", 'cannot breathe', 'unconscious', 'fainted', 
    'fainting', 'sudden weakness', 'paralysis', 'severe bleeding',
    'blood loss', 'seizure', 'convulsion', 'suicidal', 'self-harm',
    'want to die', 'overdose', 'stroke', 'heart attack', 'not breathing',
  ];
  
  const redFlagsHi = [
    'सीने में तेज दर्द', 'सांस नहीं आ रही', 'बेहोश', 'बेहोशी',
    'अचानक कमज़ोरी', 'लकवा', 'खून बह रहा', 'दौरा', 'मिर्गी',
    'आत्महत्या', 'मरना चाहता', 'मरना चाहती', 'हार्ट अटैक',
    'सांस लेने में तकलीफ', 'खून की उल्टी',
  ];
  
  for (const flag of redFlagsEn) {
    if (lower.includes(flag)) return true;
  }
  for (const flag of redFlagsHi) {
    if (text.includes(flag)) return true;
  }
  
  return false;
};
