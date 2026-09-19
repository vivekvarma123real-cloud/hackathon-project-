import json
import os
import re
import sys
import aiofiles
import tempfile
import torch
import torchaudio
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from typing import Dict, Any, List, Optional

# Fix Windows console encoding for Hindi/Unicode output
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

app = FastAPI()

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_BASE = "http://localhost:11434"
OLLAMA_CHAT_URL = f"{OLLAMA_BASE}/api/chat"
MODEL_NAME = "qwen2.5:3b"

# ============================================================
# ASR MODEL — Load AI4Bharat IndicConformer once at startup
# ============================================================

asr_model = None
vad_model = None
vad_utils = None

print("[ASR] Loading VAD model...")
try:
    vad_model, vad_utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                          model='silero_vad',
                                          force_reload=False)
    print("[ASR] Silero VAD loaded.")
except Exception as e:
    print(f"[ASR] WARNING: Could not load VAD model: {e}")

print("[ASR] Loading AI4Bharat IndicConformer (NeMo)...")
try:
    import nemo.collections.asr as nemo_asr
    MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "indicconformer")
    model_path = os.path.join(MODEL_DIR, "model.nemo")
    
    if os.path.exists(model_path):
        print(f"[ASR] Loading model from {model_path}...")
        asr_model = nemo_asr.models.EncDecHybridRNNTCTCModel.restore_from(model_path, strict=False)
        
        # Optimize for lowest possible transcription latency by using CTC decoding
        asr_model.change_decoding_strategy(decoder_type='ctc')
        
        asr_model.eval()
        if torch.cuda.is_available():
            asr_model = asr_model.to("cuda")
            print("[ASR] IndicConformer loaded successfully on CUDA (CTC strategy).")
        else:
            print("[ASR] IndicConformer loaded successfully on CPU (CTC strategy).")
    else:
        print(f"[ASR] ERROR: model.nemo not found at {model_path}")
        print("[ASR] Please run `python download_model.py` to download the public model.")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"[ASR] WARNING: Could not load IndicConformer model: {e}")

# ============================================================
# CLINICAL QUESTION DEFINITIONS (COMPLAINT-SPECIFIC)
# ============================================================

COMPLAINT_FLOWS = {
    "headache": ["chief_complaint", "headache_duration", "headache_location", "headache_severity", "headache_pattern", "headache_associated"],
    "fever": ["chief_complaint", "fever_duration", "fever_pattern", "fever_associated", "fever_other_symptoms", "fever_medications"],
    "cough": ["chief_complaint", "cough_duration", "cough_type", "cough_sputum", "cough_associated", "cough_breathing"],
    "cold": ["chief_complaint", "cold_duration", "cold_nasal", "cold_sneezing", "cold_associated", "cold_breathing"],
    "stomach_pain": ["chief_complaint", "stomach_duration", "stomach_location", "stomach_pattern", "stomach_associated", "stomach_eating"],
    "vomiting": ["chief_complaint", "vomiting_duration", "vomiting_frequency", "vomiting_associated", "vomiting_fever", "vomiting_tolerance"],
    "diarrhea": ["chief_complaint", "diarrhea_duration", "diarrhea_frequency", "diarrhea_associated", "diarrhea_fever", "diarrhea_dehydration"],
    "sore_throat": ["chief_complaint", "sore_throat_duration", "sore_throat_severity", "sore_throat_swallowing", "sore_throat_associated", "sore_throat_medications"],
    "back_pain": ["chief_complaint", "back_pain_duration", "back_location", "back_radiation", "back_neurological", "back_aggravating"],
    "unknown": ["chief_complaint", "duration"]
}

PREDEFINED_QUESTIONS = {
    "chief_complaint": {
        "hi": "आज आपको क्या तकलीफ़ हो रही है?",
        "en": "What problem are you facing today?",
        "hinglish": "Aaj aapko kya takleef ho rahi hai?"
    },
    "duration": {
        "hi": "ये तकलीफ़ कब से है?",
        "en": "Since when have you had this problem?",
        "hinglish": "Ye takleef kab se hai?"
    },
    "headache_duration": {
        "hi": "सिरदर्द कब से है?",
        "en": "Since when have you had a headache?",
        "hinglish": "Headache kab se hai?"
    },
    "headache_location": {
        "hi": "सिर में दर्द कहाँ हो रहा है?",
        "en": "Where exactly is the headache?",
        "hinglish": "Sir mein dard kahan ho raha hai?"
    },
    "headache_severity": {
        "hi": "दर्द कैसा है, हल्का, तेज़ या बहुत तेज़?",
        "en": "How would you describe the pain: mild, severe, or very severe?",
        "hinglish": "Dard kaisa hai, halka, tez ya bahut tez?"
    },
    "headache_pattern": {
        "hi": "दर्द लगातार रहता है या बीच-बीच में होता है?",
        "en": "Is the pain constant or does it come and go?",
        "hinglish": "Dard lagatar rehta hai ya beech-beech mein hota hai?"
    },
    "headache_associated": {
        "hi": "इसके साथ चक्कर, उल्टी या धुंधला दिखाई देना भी होता है?",
        "en": "Do you also have dizziness, vomiting, or blurred vision?",
        "hinglish": "Iske saath chakkar, ulti ya dhundhla dikhna bhi hota hai?"
    },
    "fever_duration": {
        "hi": "बुखार कब से है?",
        "en": "Since when have you had a fever?",
        "hinglish": "Fever kab se hai?"
    },
    "fever_pattern": {
        "hi": "बुखार लगातार रहता है या आता-जाता है?",
        "en": "Is the fever constant or does it come and go?",
        "hinglish": "Fever lagatar rehta hai ya aata-jaata hai?"
    },
    "fever_associated": {
        "hi": "बुखार के साथ ठंड लगना, शरीर में दर्द या कमजोरी भी है?",
        "en": "Do you also have chills, body aches, or weakness?",
        "hinglish": "Fever ke saath thand lagna, body pain ya weakness bhi hai?"
    },
    "fever_other_symptoms": {
        "hi": "खांसी, गले में दर्द, उल्टी, दस्त या पेशाब में जलन जैसी कोई और तकलीफ़ है?",
        "en": "Do you have any other symptoms such as cough, sore throat, vomiting, diarrhea, or burning while urinating?",
        "hinglish": "Cough, gale mein dard, ulti, loose motion ya urine karte waqt jalan jaisi koi aur problem hai?"
    },
    "fever_medications": {
        "hi": "बुखार के लिए कोई दवाई ली है?",
        "en": "Have you taken any medicine for the fever?",
        "hinglish": "Fever ke liye koi medicine li hai?"
    },
    "cough_duration": {
        "hi": "खांसी कब से हो रही है?",
        "en": "Since when have you had the cough?",
        "hinglish": "Khansi kab se ho rahi hai?"
    },
    "cough_type": {
        "hi": "खांसी सूखी है या बलगम भी निकलता है?",
        "en": "Is the cough dry, or do you have phlegm?",
        "hinglish": "Khansi dry hai ya phlegm bhi nikalta hai?"
    },
    "cough_sputum": {
        "hi": "बलगम है तो उसका रंग कैसा है?",
        "en": "If you have phlegm, what color is it?",
        "hinglish": "Agar phlegm hai, to uska color kaisa hai?"
    },
    "cough_associated": {
        "hi": "बुखार या गले में दर्द भी है?",
        "en": "Do you also have fever or a sore throat?",
        "hinglish": "Fever ya gale mein dard bhi hai?"
    },
    "cough_breathing": {
        "hi": "सांस फूलती है या सीने में दर्द भी होता है?",
        "en": "Do you have shortness of breath or chest pain?",
        "hinglish": "Saans phoolti hai ya chest mein pain bhi hota hai?"
    },
    "cold_duration": {
        "hi": "जुकाम कब से है?",
        "en": "Since when have you had the cold?",
        "hinglish": "Cold kab se hai?"
    },
    "cold_nasal": {
        "hi": "नाक बह रही है या नाक बंद है?",
        "en": "Is your nose running or blocked?",
        "hinglish": "Naak beh rahi hai ya blocked hai?"
    },
    "cold_sneezing": {
        "hi": "छींकें भी आ रही हैं?",
        "en": "Are you also sneezing?",
        "hinglish": "Chheenk bhi aa rahi hai?"
    },
    "cold_associated": {
        "hi": "गले में दर्द या बुखार भी है?",
        "en": "Do you also have a sore throat or fever?",
        "hinglish": "Gale mein dard ya fever bhi hai?"
    },
    "cold_breathing": {
        "hi": "सांस लेने में कोई परेशानी तो नहीं है?",
        "en": "Are you having any difficulty breathing?",
        "hinglish": "Saans lene mein koi problem to nahi hai?"
    },
    "stomach_duration": {
        "hi": "पेट में दर्द कब से है?",
        "en": "Since when have you had stomach pain?",
        "hinglish": "Pet mein dard kab se hai?"
    },
    "stomach_location": {
        "hi": "पेट में दर्द कहाँ हो रहा है?",
        "en": "Where exactly is the stomach pain?",
        "hinglish": "Pet mein dard kahan ho raha hai?"
    },
    "stomach_pattern": {
        "hi": "दर्द लगातार रहता है या आता-जाता है?",
        "en": "Is the pain constant or does it come and go?",
        "hinglish": "Dard lagatar rehta hai ya aata-jaata hai?"
    },
    "stomach_associated": {
        "hi": "उल्टी, दस्त या गैस जैसी कोई और तकलीफ़ है?",
        "en": "Do you also have vomiting, diarrhea, or gas?",
        "hinglish": "Ulti, loose motion ya gas jaisi koi aur problem hai?"
    },
    "stomach_eating": {
        "hi": "खाना खाने से दर्द बढ़ता है या कम होता है?",
        "en": "Does the pain get worse or better after eating?",
        "hinglish": "Khana khane se dard badhta hai ya kam hota hai?"
    },
    "vomiting_duration": {
        "hi": "उल्टी कब से हो रही है?",
        "en": "Since when have you been vomiting?",
        "hinglish": "Ulti kab se ho rahi hai?"
    },
    "vomiting_frequency": {
        "hi": "आज कितनी बार उल्टी हुई है?",
        "en": "How many times have you vomited today?",
        "hinglish": "Aaj kitni baar ulti hui hai?"
    },
    "vomiting_associated": {
        "hi": "पेट में दर्द या दस्त भी हैं?",
        "en": "Do you also have stomach pain or diarrhea?",
        "hinglish": "Pet mein dard ya loose motion bhi hain?"
    },
    "vomiting_fever": {
        "hi": "बुखार भी है?",
        "en": "Do you also have a fever?",
        "hinglish": "Fever bhi hai?"
    },
    "vomiting_tolerance": {
        "hi": "पानी या खाना लेने पर भी उल्टी हो जाती है?",
        "en": "Do you vomit even after drinking water or eating food?",
        "hinglish": "Paani ya khana lene par bhi ulti ho jaati hai?"
    },
    "diarrhea_duration": {
        "hi": "दस्त कब से हो रहे हैं?",
        "en": "Since when have you had diarrhea?",
        "hinglish": "Loose motion kab se ho rahe hain?"
    },
    "diarrhea_frequency": {
        "hi": "दिन में लगभग कितनी बार दस्त हो रहे हैं?",
        "en": "About how many times are you having diarrhea in a day?",
        "hinglish": "Din mein lagbhag kitni baar loose motion ho rahe hain?"
    },
    "diarrhea_associated": {
        "hi": "उल्टी या पेट में दर्द भी है?",
        "en": "Do you also have vomiting or stomach pain?",
        "hinglish": "Ulti ya pet mein dard bhi hai?"
    },
    "diarrhea_fever": {
        "hi": "बुखार भी है?",
        "en": "Do you also have a fever?",
        "hinglish": "Fever bhi hai?"
    },
    "diarrhea_dehydration": {
        "hi": "बहुत प्यास लगना, चक्कर आना या कमजोरी जैसी परेशानी तो नहीं है?",
        "en": "Are you having excessive thirst, dizziness, or weakness?",
        "hinglish": "Bahut pyaas lagna, chakkar aana ya weakness jaisi problem to nahi hai?"
    },
    "sore_throat_duration": {
        "hi": "गले में दर्द कब से है?",
        "en": "Since when have you had a sore throat?",
        "hinglish": "Gale mein dard kab se hai?"
    },
    "sore_throat_severity": {
        "hi": "गले में दर्द कितना है, हल्का, तेज़ या बहुत तेज़?",
        "en": "How severe is the throat pain: mild, severe, or very severe?",
        "hinglish": "Gale mein dard kitna hai, halka, tez ya bahut tez?"
    },
    "sore_throat_swallowing": {
        "hi": "निगलने में दर्द या परेशानी होती है?",
        "en": "Do you have pain or difficulty when swallowing?",
        "hinglish": "Nigalne mein dard ya problem hoti hai?"
    },
    "sore_throat_associated": {
        "hi": "बुखार या खांसी भी है?",
        "en": "Do you also have fever or cough?",
        "hinglish": "Fever ya cough bhi hai?"
    },
    "sore_throat_medications": {
        "hi": "इसके लिए कोई दवाई ली है?",
        "en": "Have you taken any medicine for it?",
        "hinglish": "Iske liye koi medicine li hai?"
    },
    "back_pain_duration": {
        "hi": "कमर में दर्द कब से है?",
        "en": "Since when have you had back pain?",
        "hinglish": "Kamar mein dard kab se hai?"
    },
    "back_location": {
        "hi": "दर्द कमर के किस हिस्से में है?",
        "en": "Where exactly is the back pain?",
        "hinglish": "Dard kamar ke kis part mein hai?"
    },
    "back_radiation": {
        "hi": "दर्द पैर तक भी जाता है?",
        "en": "Does the pain also travel down your leg?",
        "hinglish": "Dard pair tak bhi jaata hai?"
    },
    "back_neurological": {
        "hi": "पैर में सुन्नपन, झनझनाहट या कमजोरी भी है?",
        "en": "Do you also have numbness, tingling, or weakness in your leg?",
        "hinglish": "Pair mein sunnpan, jhanjhanahat ya weakness bhi hai?"
    },
    "back_aggravating": {
        "hi": "चलने, झुकने या बैठने से दर्द बढ़ता है?",
        "en": "Does the pain get worse when walking, bending, or sitting?",
        "hinglish": "Chalne, jhukne ya baithne se dard badhta hai?"
    }
}

LOCALIZED_COMPLAINTS = {
    "headache": {"en": "headache", "hi": "सिरदर्द"},
    "fever": {"en": "fever", "hi": "बुखार"},
    "cough": {"en": "the cough", "hi": "खांसी"},
    "cold": {"en": "the cold", "hi": "जुकाम"},
    "stomach_pain": {"en": "stomach pain", "hi": "पेट में दर्द"},
    "vomiting": {"en": "vomiting", "hi": "उल्टी"},
    "diarrhea": {"en": "diarrhea", "hi": "दस्त"},
    "sore_throat": {"en": "throat pain", "hi": "गले में दर्द"},
    "back_pain": {"en": "back pain", "hi": "कमर में दर्द"},
    "unknown": {"en": "this problem", "hi": "ये तकलीफ़"}
}

# ============================================================
# RED FLAG KEYWORDS
# ============================================================

RED_FLAG_KEYWORDS_EN = [
    "severe chest pain", "chest tightness", "difficulty breathing", "can't breathe",
    "cannot breathe", "unconscious", "fainted", "fainting", "sudden weakness",
    "paralysis", "severe bleeding", "blood loss", "seizure", "convulsion",
    "suicidal", "self-harm", "want to die", "overdose", "stroke",
    "heart attack", "not breathing",
]

RED_FLAG_KEYWORDS_HI = [
    "सीने में तेज दर्द", "सांस नहीं आ रही", "बेहोश", "बेहोशी",
    "अचानक कमज़ोरी", "लकवा", "खून बह रहा", "दौरा", "मिर्गी",
    "आत्महत्या", "मरना चाहता", "मरना चाहती", "हार्ट अटैक",
    "सांस लेने में तकलीफ", "खून की उल्टी",
]


def check_red_flags(text: str) -> bool:
    """Check if patient answer contains emergency red flag keywords."""
    lower = text.lower()
    for kw in RED_FLAG_KEYWORDS_EN:
        if kw in lower:
            return True
    for kw in RED_FLAG_KEYWORDS_HI:
        if kw in text:
            return True
    return False


# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================

class Message(BaseModel):
    role: str
    content: str

class InterviewRequest(BaseModel):
    sessionLanguage: str  # "en" or "hi"
    currentQuestionId: str  # current category being asked
    latestAnswer: str  # patient's latest answer text
    structuredAnswers: Dict[str, str]  # answers collected so far
    conversationHistory: List[Message]  # full conversation so far
    chiefComplaint: str = ""  # initial complaint if any

class SummaryRequest(BaseModel):
    sessionLanguage: str
    structuredAnswers: Dict[str, str]
    conversationHistory: List[Message]

# Legacy model kept for backward compatibility
class ChatRequest(BaseModel):
    messages: List[Message]
    language: str = "en"


# ============================================================
# HELPER: Call Ollama
# ============================================================

async def call_ollama(system_prompt: str, user_prompt: str, json_mode: bool = True, timeout: float = 60.0) -> Optional[str]:
    """Call local Ollama with the Qwen model. Returns raw response text or None on failure."""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    
    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "stream": False,
    }
    if json_mode:
        payload["format"] = "json"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(OLLAMA_CHAT_URL, json=payload, timeout=timeout)
            response.raise_for_status()
            data = response.json()
            content = data.get("message", {}).get("content", "").strip()
            return content
    except httpx.TimeoutException:
        print("[OLLAMA] Request timed out")
        return None
    except httpx.ConnectError:
        print("[OLLAMA] Cannot connect to Ollama at localhost:11434. Is Ollama running?")
        return None
    except Exception as e:
        print(f"[OLLAMA] Error: {e}")
        return None


def safe_parse_json(text: str) -> Optional[dict]:
    """Try to parse JSON from Ollama response, with fallback extraction."""
    if not text:
        return None
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try to find JSON object in the text
    match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None


def get_next_question_id(current_id: str, structured_answers: Dict[str, str], complaint_category: str = "unknown") -> Optional[str]:
    """Get the next unanswered question ID based on the specific complaint flow."""
    flow = COMPLAINT_FLOWS.get(complaint_category, COMPLAINT_FLOWS["unknown"])
    
    try:
        current_idx = flow.index(current_id)
    except ValueError:
        current_idx = -1
    
    for i in range(current_idx + 1, len(flow)):
        qid = flow[i]
        
        # Check if it's already answered directly
        if structured_answers.get(qid, "").strip():
            continue
            
        # Special skip rule for duration: if Q1 extracted duration, skip Q2 (which is typically *_duration)
        if qid.endswith("duration") and structured_answers.get("duration", "").strip():
            # Automatically populate this specific duration key so it's marked as answered
            structured_answers[qid] = structured_answers["duration"]
            continue
            
        return qid
    
    return None  # All questions answered


# ============================================================
# ENDPOINT: /api/transcribe
# ============================================================

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if asr_model is None:
        raise HTTPException(status_code=500, detail="ASR model not loaded. Check server logs.")
    
    import uuid
    import os
    temp_file_path = f"temp_{uuid.uuid4()}_{file.filename}"
    async with aiofiles.open(temp_file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
        
    if os.path.getsize(temp_file_path) < 100:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        return {"text": "", "detectedLanguage": "hi"}
        
    try:
        detected_lang = "hi"
        # Convert audio to 16kHz mono using static ffmpeg
        import subprocess
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        wav_path = f"{temp_file_path}.wav"
        
        try:
            subprocess.run(
                [ffmpeg_exe, "-y", "-i", temp_file_path, "-ar", "16000", "-ac", "1", wav_path],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            wav, sr = torchaudio.load(wav_path)
        except Exception as e:
            print(f"[ASR] ffmpeg conversion or loading failed (audio likely empty/invalid): {e}")
            return {"text": "", "detectedLanguage": "hi"}
        finally:
            if os.path.exists(wav_path):
                os.remove(wav_path)
                
        if wav.shape[0] > 1:
            wav = torch.mean(wav, dim=0, keepdim=True)
        if sr != 16000:
            transform = torchaudio.transforms.Resample(orig_freq=sr, new_freq=16000)
            wav = transform(wav)
        
        # Use VAD for chunking (if VAD loaded)
        transcription_parts = []
        if vad_model and vad_utils:
            get_speech_timestamps, save_audio, _, _, _ = vad_utils
            wav_1d = wav.squeeze()
            speech_timestamps = get_speech_timestamps(wav_1d, vad_model, sampling_rate=16000)
            
            if not speech_timestamps:
                return {"text": "", "detectedLanguage": detected_lang}
            
            # Save chunks to temp files for NeMo
            chunk_files = []
            for i, ts in enumerate(speech_timestamps):
                chunk = wav[:, ts['start']:ts['end']]
                chunk_path = f"{temp_file_path}_chunk_{i}.wav"
                torchaudio.save(chunk_path, chunk, 16000)
                chunk_files.append(chunk_path)
            
            if chunk_files:
                # Transcribe all chunks in a batch using NeMo
                with torch.no_grad():
                    chunk_transcriptions = asr_model.transcribe(paths2audio_files=chunk_files, batch_size=4)
                    if isinstance(chunk_transcriptions, tuple):
                        chunk_transcriptions = chunk_transcriptions[0]
                    transcription_parts.extend(chunk_transcriptions)
            
            # Clean up temp chunks
            for cf in chunk_files:
                if os.path.exists(cf):
                    os.remove(cf)
        else:
            # No VAD, decode all
            with torch.no_grad():
                full_trans = asr_model.transcribe(paths2audio_files=[temp_file_path], batch_size=1)
                if isinstance(full_trans, tuple):
                    full_trans = full_trans[0]
                transcription_parts.extend(full_trans)

        cleaned = " ".join(transcription_parts).strip()
        print(f"[ASR] Transcribed: '{cleaned}' (detected: {detected_lang})")
        return {"text": cleaned, "detectedLanguage": detected_lang}
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


# ============================================================
# ENDPOINT: /api/interview (State Machine)
# ============================================================

SYSTEM_PROMPT = """You are MediKiosk, a clinical intake assistant at a hospital self-service kiosk.

Your job is to collect structured medical information from a patient before they meet a doctor.

You are NOT a doctor. You do NOT diagnose. You do NOT prescribe medicines.

CRITICAL RULES:
1. You MUST respond in valid JSON only.
2. Ask EXACTLY ONE question at a time. NEVER combine multiple questions.
3. Use short, simple, everyday Indian language suitable for a hospital kiosk patient.
4. If the session is Hindi, use natural everyday spoken Hindi (or Hinglish if the patient uses it). Do NOT use overly formal Hindi.
5. Do NOT invent patient information or symptoms.
6. Do NOT give medical diagnoses or treatment advice.
7. Extract the key clinical information from the patient's answer accurately."""


@app.post("/api/interview")
async def interview(request: InterviewRequest):
    lang = request.sessionLanguage
    current_qid = request.currentQuestionId
    answer = request.latestAnswer.strip()
    structured = request.structuredAnswers.copy()
    history = request.conversationHistory
    
    print(f"\n[INTERVIEW] === Processing ===")
    print(f"[INTERVIEW] questionId={current_qid}, language={lang}")
    print(f"[INTERVIEW] answer='{answer[:100]}...' " if len(answer) > 100 else f"[INTERVIEW] answer='{answer}'")
    
    # ---- Check for red flags ----
    if answer and check_red_flags(answer):
        print(f"[INTERVIEW] RED FLAG detected in answer!")
        red_flag_msg = {
            "en": "Your symptoms may require immediate emergency attention. Please proceed to the Emergency Department immediately or alert hospital staff.",
            "hi": "आपके लक्षणों को तुरंत आपातकालीन ध्यान की आवश्यकता हो सकती है। कृपया तुरंत आपातकालीन विभाग में जाएं या अस्पताल के कर्मचारियों को सूचित करें।",
        }
        return {
            "type": "red_flag",
            "questionId": None,
            "question": red_flag_msg.get(lang, red_flag_msg["en"]),
            "inputType": None,
            "language": lang,
            "complete": True,
            "extractedInfo": answer,
        }
    
    # ---- Use Qwen to extract structured info from answer ----
    if answer and current_qid:
        # Normalization
        norm_answer = answer.lower().replace("।", "").strip()
        import re
        norm_answer = re.sub(r'\s+', ' ', norm_answer)

        if current_qid == "chief_complaint":
            extract_prompt = f"""You are a clinical complaint classification and information extraction engine.
Your job is NOT to generate questions.
Read the patient's answer and identify the primary complaint.

The patient's answer was: "{norm_answer}"

Supported categories:
headache, fever, cough, cold, stomach_pain, vomiting, diarrhea, sore_throat, back_pain, unknown

Understand Hindi, English, Hinglish, Roman Hindi, and mixed-language speech.
Map synonymous expressions to the correct category.
Examples:
कमर दर्द -> back_pain
kamar mein dard -> back_pain
kamar pain -> back_pain
back pain -> back_pain

खांसी -> cough
khansi -> cough
cough -> cough
dry cough -> cough
cough with phlegm -> cough

If the patient mentions multiple symptoms, identify the main complaint based on the patient's statement.
Example: "Mujhe kamar mein dard hai aur pair mein thoda sunnpan hai."
Result: complaint_category: back_pain, associated_symptoms: ["leg numbness"]

Extract duration if it is present. If duration is not present, set to null.

Return ONLY valid JSON. Do not generate questions. Do not diagnose. Do not invent information.
Return JSON: {{"complaint_category": "<category>", "complaint_text": "<exact problem translated to English>", "duration": "<duration_or_null>", "associated_symptoms": [], "language": "<language>"}}"""
        else:
            extract_prompt = f"""The patient was asked about: {current_qid}
The patient's answer was: "{answer}"

Extract the key medical information from this answer in 1-2 short sentences.
Return JSON: {{"extracted": "the key information"}}"""
        
        print(f"[QWEN] request started (extract)")
        extract_response = await call_ollama(SYSTEM_PROMPT, extract_prompt, json_mode=True, timeout=30.0)
        print(f"[QWEN] response received (extract)")
        print(f"[QWEN] parsed response: {extract_response}")
        extracted = None
        
        # Heuristic language detection
        import string
        if any('\u0900' <= c <= '\u097F' for c in answer):
            lang = "hi"
        elif any(c in string.ascii_letters for c in answer):
            lang = "hinglish" if "hinglish" in request.sessionLanguage or "hi" in request.sessionLanguage else "en"
            
        if extract_response:
            parsed = safe_parse_json(extract_response)
            if not parsed:
                parsed = {}
                
            if current_qid == "chief_complaint":
                cat = parsed.get("complaint_category", "unknown")
                ans_lower = norm_answer
                
                # Robust heuristic explicit keyword override for chief complaint
                if any(w in ans_lower for w in ["kamar", "कमर", "peeth", "पीठ", "back"]):
                    cat = "back_pain"
                elif any(w in ans_lower for w in ["pet", "पेट", "stomach"]):
                    cat = "stomach_pain"
                elif any(w in ans_lower for w in ["sir", "sar", "सिर", "सर", "headache"]):
                    # "sar" might match other things, but in medical context, usually sar/sir means head
                    cat = "headache"
                elif any(w in ans_lower for w in ["gale", "gala", "गले", "गला", "throat"]):
                    cat = "sore_throat"
                elif any(w in ans_lower for w in ["khansi", "khaasi", "खांसी", "खॉसी", "cough"]):
                    cat = "cough"
                elif any(w in ans_lower for w in ["jukam", "sardi", "जुकाम", "सर्दी", "cold"]):
                    cat = "cold"
                elif any(w in ans_lower for w in ["bukhar", "fever", "बुखार", "tap"]):
                    cat = "fever"
                elif any(w in ans_lower for w in ["ulti", "vomiting", "उल्टी"]):
                    cat = "vomiting"
                elif any(w in ans_lower for w in ["dast", "loose motion", "diarrhea", "दस्त"]):
                    cat = "diarrhea"
                
                structured["chief_complaint_category"] = cat
                if parsed.get("complaint_text"):
                    structured["chief_complaint"] = parsed.get("complaint_text")
                if parsed.get("duration"):
                    structured["duration"] = parsed.get("duration")
                
                assoc = parsed.get("associated_symptoms")
                if assoc:
                    if isinstance(assoc, list):
                        structured["_temp_associated"] = ", ".join(assoc)
                    else:
                        structured["_temp_associated"] = str(assoc)
                        
                if parsed.get("cough_type"):
                    structured["cough_type"] = parsed.get("cough_type")
                # Fallback for cough type if Qwen missed it
                if not structured.get("cough_type") and structured.get("chief_complaint_category") == "cough":
                    if "dry" in ans_lower or "sookhi" in ans_lower or "सूखी" in ans_lower:
                        structured["cough_type"] = "dry"
                    elif "phlegm" in ans_lower or "wet" in ans_lower or "balgam" in ans_lower or "बलगम" in ans_lower:
                        structured["cough_type"] = "phlegm"
            if "extracted" in parsed:
                extracted = parsed["extracted"]
        
        # Store the answer
        if current_qid == "chief_complaint":
            structured[current_qid] = extracted if extracted else parsed.get("complaint_text", answer)
        else:
            structured[current_qid] = extracted if extracted else answer
        
        # Merge temp associated if any, so we don't ask about it later
        if "_temp_associated" in structured and structured["_temp_associated"]:
            assoc_key = next((k for k in COMPLAINT_FLOWS.get(structured.get("chief_complaint_category", "unknown"), []) if "associated" in k), "associated_symptoms")
            structured[assoc_key] = structured["_temp_associated"]
            del structured["_temp_associated"]
            
        print(f"[INTERVIEW] Stored answer for {current_qid}: '{structured[current_qid][:80]}'")
    
    complaint_category = structured.get("chief_complaint_category", "unknown")
    
    # ---- Determine next question ----
    next_qid = get_next_question_id(current_qid, structured, complaint_category)
    
    if next_qid is None:
        # All questions covered
        print(f"[INTERVIEW] All categories covered. Interview complete.")
        return {
            "type": "complete",
            "questionId": None,
            "question": None,
            "inputType": None,
            "language": lang,
            "complete": True,
            "extractedInfo": structured.get(current_qid, answer),
            "structuredAnswers": structured,
        }
    
    chief = structured.get("chief_complaint", request.chiefComplaint or "")
    
    # ---- Generate the question text ----
    question_text = PREDEFINED_QUESTIONS.get(next_qid, {}).get(lang, f"Please tell me more about your {next_qid.replace('_', ' ')}.")
    
    print(f"[INTERVIEW] nextQuestion={next_qid}, text='{question_text[:80]}', source='COMPLAINT_FLOWS'")
    
    print("\n[MEDIKIOSK DEBUG]")
    print(f"Raw transcript:\n{answer}")
    if current_qid == "chief_complaint":
        try:
            # We recreate norm_answer here if it's out of scope or just use a simplified version for logging
            norm_ans = answer.lower().replace("।", "").strip()
            import re
            norm_ans = re.sub(r'\s+', ' ', norm_ans)
            print(f"Normalized transcript:\n{norm_ans}")
        except Exception:
            pass
    print(f"Detected language:\n{lang}")
    print(f"Detected complaint:\n{structured.get('chief_complaint_category', 'unknown')}")
    print(f"Duration:\n{structured.get('duration', 'None')}")
    
    assoc_key = next((k for k in COMPLAINT_FLOWS.get(structured.get("chief_complaint_category", "unknown"), []) if "associated" in k), "associated_symptoms")
    print(f"Associated symptoms:\n{structured.get(assoc_key, 'None')}")
    
    print(f"Selected flow:\n{structured.get('chief_complaint_category', 'unknown')}")
    print(f"Next question:\n{question_text}")
    print("Question source:\nCOMPLAINT_FLOWS\n")
    
    return {
        "type": "question",
        "questionId": next_qid,
        "question": question_text,
        "inputType": "text",
        "language": lang,
        "complete": False,
        "extractedInfo": structured.get(current_qid, answer) if current_qid else None,
        "structuredAnswers": structured,
    }


# ============================================================
# ENDPOINT: /api/summary
# ============================================================

@app.post("/api/summary")
async def generate_summary(request: SummaryRequest):
    lang = request.sessionLanguage
    structured = request.structuredAnswers
    not_reported = "Not reported" if lang == "en" else "जानकारी नहीं दी गई"
    
    print(f"\n[SUMMARY] Generating clinical summary (language={lang})")
    
    # Provide the structured answers to Qwen to generate the standard 10 categories format
    summary_prompt = f"""The patient completed a medical interview. Here is the data collected:
{json.dumps(structured, indent=2, ensure_ascii=False)}

Map this information into the following categories. Do not invent any diagnoses or treatments. If information for a category is missing, output "{not_reported}".
Return JSON with EXACTLY these keys:
"chiefComplaint", "location", "onset", "duration", "severity", "aggravatingRelievingFactors", "associatedSymptoms", "pastMedicalHistory", "medications", "allergies", "additionalInformation"
"""
    summary = {
        "chiefComplaint": structured.get("chief_complaint", not_reported),
        "location": not_reported,
        "onset": not_reported,
        "duration": structured.get("duration", not_reported),
        "severity": not_reported,
        "aggravatingRelievingFactors": not_reported,
        "associatedSymptoms": not_reported,
        "pastMedicalHistory": not_reported,
        "medications": not_reported,
        "allergies": not_reported,
        "additionalInformation": not_reported,
    }

    summary_response = await call_ollama(SYSTEM_PROMPT, summary_prompt, json_mode=True, timeout=30.0)
    if summary_response:
        parsed_sum = safe_parse_json(summary_response)
        if parsed_sum:
            for key in summary.keys():
                if key in parsed_sum and parsed_sum[key] and str(parsed_sum[key]).strip() and str(parsed_sum[key]).strip().lower() not in ["none", "null", "n/a", ""]:
                    summary[key] = parsed_sum[key]
                    
    # Ensure no empty strings
    for key in summary:
        if not summary[key] or str(summary[key]).strip() == "":
            summary[key] = not_reported
    
    print(f"[SUMMARY] Generated summary with {sum(1 for v in summary.values() if v != not_reported)} filled fields")
    
    return {"summary": summary, "language": lang}


# ============================================================
# ENDPOINT: /api/health (check Ollama connectivity)
# ============================================================

@app.get("/api/health")
async def health_check():
    ollama_ok = False
    asr_ok = asr_model is not None
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{OLLAMA_BASE}/api/tags", timeout=5.0)
            ollama_ok = resp.status_code == 200
    except Exception:
        pass
    
    return {
        "status": "ok" if (ollama_ok and asr_ok) else "degraded",
        "ollama": ollama_ok,
        "asr": asr_ok,
        "model": MODEL_NAME,
    }


# ============================================================
# LEGACY ENDPOINT: /api/chat (kept for backward compatibility)
# ============================================================

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Legacy chat endpoint. Use /api/interview instead."""
    conversation_history = ""
    for msg in request.messages:
        role = "AI Assistant" if msg.role == "assistant" else "Patient"
        conversation_history += f"{role}: {msg.content}\n"

    prompt = f"""Based on the conversation history, ask exactly ONE short follow-up question.
Respond in {"Hindi" if request.language == "hi" else "English"}.
Return JSON: {{"type": "question", "question": "your question", "language": "{request.language}"}}

Conversation:
{conversation_history}"""

    response = await call_ollama(SYSTEM_PROMPT, prompt, json_mode=True, timeout=30.0)
    if response:
        parsed = safe_parse_json(response)
        if parsed:
            return parsed
    
    # Fallback
    return {"type": "question", "question": PREDEFINED_QUESTIONS["location"].get(request.language, "Where is the problem?"), "language": request.language}


# ============================================================
# LEGACY ENDPOINT: /api/generate (kept for backward compatibility)
# ============================================================

@app.post("/api/generate")
async def generate_legacy_summary(request: ChatRequest):
    """Legacy summary endpoint. Use /api/summary instead."""
    conversation_history = ""
    for msg in request.messages:
        role = "AI Assistant" if msg.role == "assistant" else "Patient"
        conversation_history += f"{role}: {msg.content}\n"
    
    prompt = f"""Based on this patient interview, generate a structured clinical summary.
Interview: {conversation_history}

Return a clear summary with sections: Chief Complaint, History of Present Illness, Past Medical History, Current Medications, Allergies.
Only use information from the transcript. Write "Not provided" for missing sections."""
    
    response = await call_ollama(SYSTEM_PROMPT, prompt, json_mode=False, timeout=60.0)
    if response:
        return {"summary": response}
    
    return {"summary": "Summary generation failed. Please try again."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


