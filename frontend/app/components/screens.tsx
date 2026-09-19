'use client'
import {useState, useEffect, useRef, useCallback, Fragment} from 'react'
import jsQR from "jsqr";
import {AlertTriangle,ArrowRight,Check,FileText,Languages,Mic,ScanLine,ShieldCheck,Volume2,UserRound,HeartPulse,Camera,IdCard,Clock3,Printer,RotateCcw,X,LayoutGrid,UserPlus,Thermometer,Activity,Wind,Hand,Upload,RefreshCw,Send} from 'lucide-react'
import {useKioskStore} from '../../lib/store';import {Button,Card,Icon,Keyboard} from './ui';import {copy} from './chrome'
import { speakText, checkRedFlags, getTTSLang, cancelSpeech } from '../../lib/speech';
import { submitInterviewAnswer, generateSummaryApi, transcribeAudioApi } from '../../lib/clinicalApi';
import { PresentConditionSchema, PastConditionSchema, isFormComplete } from '../../lib/schema';
const L:any={English:{welcome:'Welcome',welcomeSub:'Let us prepare your medical history before you meet your doctor.',choose:'Choose your language',languageHint:'Select the language you are most comfortable with.',english:'English',hindi:'हिंदी',gujarati:'ગુજરાતી',next:'Next',voiceTitle:'Would you like voice guidance?',voiceSub:'MediKiosk can speak every instruction and question aloud.',voiceYes:'Yes, use voice',voiceNo:'No, I will read',consentTitle:'Before we begin',consentSub:'Please give permission before we collect your health information.',consent1:'We will ask about your symptoms, medicines, allergies and medical history.',consent2:'You can speak or use the large touch buttons. Staff can help at any time.',consent3:'Your answers are prepared for the hospital team and handled as a private session.',consent4:'Consent can be withdrawn by asking the hospital staff.',audioExplanation:'Audio explanation',audioExplanationText:'Please listen carefully. Your answers will be shared securely with the hospital team for your care.',agree:'I understand and agree to continue.',idTitle:'Identify yourself',idSub:'Please place your ABHA card under the scanner.',place:'PLACE ABHA CARD HERE',scan:'Scan ABHA Card',manual:'I do not have an ABHA card',scanning:'Reading your ABHA card…',idDone:'ABHA card detected',idDoneSub:'Patient identity verified for this session.',complaintTitle:'What is bothering you today?',complaintSub:'Tap the picture that best matches your main problem.',fever:'Fever',pain:'Pain',breath:'Breathing problem',stomach:'Stomach problem',skin:'Skin problem',other:'Other',durationTitle:'When did this problem start?',durationSub:'Choose the closest answer.',day:'Less than 1 day',week:'1–7 days',more:'More than a week',docsTitle:'Do you have a medical document?',docsSub:'You can scan a prescription, lab report or discharge summary.',yes:'Yes, scan a document',no:'No, continue without one',scanTitle:'Place your document here',scanSub:'Align the full page inside the guide. The kiosk will capture it automatically.',tray:'DOCUMENT SCANNER',startScan:'Start Scan',scanningDoc:'Scanning document…',docDone:'Document captured',docDoneSub:'OCR will extract medicines, diagnoses and investigation values for review.',reviewTitle:'Review before sending',reviewSub:'Your answers will be prepared for the doctor. Please check the key details.',identity:'Patient identity',complaint:'Main problem',duration:'Started',documents:'Documents',alert:'Priority triage alert',alertSub:'Breathing difficulty can need urgent assessment. Please wait for staff.',ready:'Your medical history is ready',readySub:'Your structured history has been prepared for the consultation team.',token:'OPD TOKEN',waiting:'Please proceed to the waiting area.',secure:'Secure handoff • Session data will be cleared after completion.',print:'Print token'},'हिंदी':{welcome:'स्वागत है',welcomeSub:'डॉक्टर से मिलने से पहले अपना मेडिकल इतिहास तैयार करें।',choose:'अपनी भाषा चुनें',languageHint:'वह भाषा चुनें जिसमें आप सबसे सहज हैं।',english:'English',hindi:'हिंदी',gujarati:'ગુજરાતી',next:'आगे',voiceTitle:'क्या आप आवाज़ में मार्गदर्शन चाहते हैं?',voiceSub:'MediKiosk हर निर्देश और प्रश्न को बोलकर सुना सकता है।',voiceYes:'हाँ, आवाज़ चालू रखें',voiceNo:'नहीं, मैं पढ़ूँगा',consentTitle:'शुरू करने से पहले',consentSub:'स्वास्थ्य जानकारी लेने से पहले कृपया अनुमति दें।',consent1:'हम आपके लक्षण, दवाइयों, एलर्जी और मेडिकल इतिहास के बारे में पूछेंगे।',consent2:'आप बोलकर या बड़े टच बटन से जवाब दे सकते हैं। स्टाफ मदद कर सकता है।',consent3:'आपकी जानकारी अस्पताल की टीम के लिए तैयार की जाएगी और यह निजी सत्र है।',agree:'मैं समझता हूँ और आगे बढ़ने की सहमति देता हूँ।',idTitle:'अपनी पहचान बताएं',idSub:'कृपया अपना ABHA कार्ड स्कैनर के नीचे रखें।',place:'यहाँ ABHA कार्ड रखें',scan:'ABHA कार्ड स्कैन करें',manual:'मेरे पास ABHA कार्ड नहीं है',scanning:'आपका ABHA कार्ड पढ़ा जा रहा है…',idDone:'ABHA कार्ड मिल गया',idDoneSub:'इस सत्र के लिए पहचान सत्यापित हो गई है।',complaintTitle:'आज आपको क्या परेशानी है?',complaintSub:'अपनी मुख्य परेशानी के अनुसार तस्वीर चुनें।',fever:'बुखार',pain:'दर्द',breath:'साँस लेने में परेशानी',stomach:'पेट की समस्या',skin:'त्वचा की समस्या',other:'अन्य',durationTitle:'यह परेशानी कब शुरू हुई?',durationSub:'सबसे सही उत्तर चुनें।',day:'1 दिन से कम',week:'1–7 दिन',more:'एक सप्ताह से अधिक',docsTitle:'क्या आपके पास मेडिकल दस्तावेज़ है?',docsSub:'आप प्रिस्क्रिप्शन, लैब रिपोर्ट या डिस्चार्ज सारांश स्कैन कर सकते हैं।',yes:'हाँ, दस्तावेज़ स्कैन करें',no:'नहीं, बिना दस्तावेज़ आगे बढ़ें',scanTitle:'दस्तावेज़ यहाँ रखें',scanSub:'पूरे पेज को गाइड के अंदर रखें। कियोस्क इसे कैप्चर करेगा।',tray:'दस्तावेज़ स्कैनर',startScan:'स्कैन शुरू करें',scanningDoc:'दस्तावेज़ स्कैन हो रहा है…',docDone:'दस्तावेज़ कैप्चर हो गया',docDoneSub:'OCR दवाइयाँ, निदान और जाँच के परिणाम समीक्षा के लिए निकालेगा।',reviewTitle:'भेजने से पहले जाँचें',reviewSub:'आपकी जानकारी डॉक्टर के लिए तैयार की जाएगी। मुख्य विवरण जाँचें।',identity:'मरीज़ की पहचान',complaint:'मुख्य परेशानी',duration:'शुरुआत',documents:'दस्तावेज़',alert:'प्राथमिकता ट्रायेज अलर्ट',alertSub:'साँस लेने में परेशानी में तुरंत जाँच की आवश्यकता हो सकती है। स्टाफ की प्रतीक्षा करें।',ready:'आपका मेडिकल इतिहास तैयार है',readySub:'आपका संरचित इतिहास परामर्श टीम के लिए तैयार છે.',token:'ઓપીડી ટોકન',waiting:'કૃપા કરીને વેઇટિંગ એરિયામાં જાઓ.',secure:'સુરક્ષિત હેન્ડઓફ • સત્ર પૂર્ણ થયા પછી અસ્થાયી ડેટા સાફ થશે.',print:'ટોકન પ્રિન્ટ કરો'},'ગુજરાતી':{welcome:'સ્વાગત છે',welcomeSub:'ડૉક્ટરને મળતા પહેલાં તમારો મેડિકલ ઇતિહાસ તૈયાર કરીએ.',choose:'તમારી ભાષા પસંદ કરો',languageHint:'જે ભાષામાં તમે સૌથી વધુ આરામદાયક હો તે પસંદ કરો.',english:'English',hindi:'हिंदी',gujarati:'ગુજરાતી',next:'આગળ',voiceTitle:'શું તમને અવાજ દ્વારા માર્ગદર્શન જોઈએ છે?',voiceSub:'MediKiosk દરેક સૂચના અને પ્રશ્ન અવાજમાં કહી શકે છે.',voiceYes:'હા, અવાજ ચાલુ રાખો',voiceNo:'ના, હું વાંચીશ',consentTitle:'શરૂ કરતાં પહેલાં',consentSub:'તમારી આરોગ્ય માહિતી લેતા પહેલાં કૃપા કરીને પરવાનગી આપો.',consent1:'અમે તમારા લક્ષણો, દવાઓ, એલર્જી અને મેડિકલ ઇતિહાસ વિશે પૂછીશું.',consent2:'તમે બોલીને અથવા મોટા ટચ બટનથી જવાબ આપી શકો છો. સ્ટાફ મદદ કરી શકે છે.',consent3:'તમારા જવાબો હોસ્પિટલની ટીમ માટે તૈયાર કરવામાં આવશે અને આ ખાનગી સત્ર છે.',agree:'હું સમજું છું અને આગળ વધવા માટે સંમત છું.',idTitle:'તમારી ઓળખ આપો',idSub:'કૃપા કરીને તમારું ABHA કાર્ડ સ્કેનર નીચે મૂકો.',place:'અહીં ABHA કાર્ડ મૂકો',scan:'ABHA કાર્ડ સ્કેન કરો',manual:'મારી પાસે ABHA કાર્ડ નથી',scanning:'તમારું ABHA કાર્ડ વાંચવામાં આવી રહ્યું છે…',idDone:'ABHA કાર્ડ મળી ગયું',idDoneSub:'આ સત્ર માટે ઓળખ ચકાસાઈ ગઈ છે.',complaintTitle:'આજે તમને શું તકલીફ છે?',complaintSub:'તમારી મુખ્ય તકલીફ સાથે મેળ ખાતું ચિત્ર પસંદ કરો.',fever:'તાવ',pain:'દુખાવો',breath:'શ્વાસ લેવામાં તકલીફ',stomach:'પેટની તકલીફ',skin:'ત્વચાની તકલીફ',other:'બીજું',durationTitle:'આ તકલીફ ક્યારે શરૂ થઈ?',durationSub:'સૌથી નજીકનો જવાબ પસંદ કરો.',day:'1 દિવસથી ઓછું',week:'1–7 દિવસ',more:'એક અઠવાડિયાથી વધુ',docsTitle:'શું તમારી પાસે મેડિકલ દસ્તાવેજ છે?',docsSub:'તમે પ્રિસ્ક્રિપ્શન, લેબ રિપોર્ટ અથવા ડિસ્ચાર્જ સમરી સ્કેન કરી શકો છો.',yes:'હા, દસ્તાવેજ સ્કેન કરો',no:'ના, દસ્તાવેજ વગર આગળ વધો',scanTitle:'દસ્તાવેજ અહીં મૂકો',scanSub:'આખું પેજ ગાઇડની અંદર રાખો. કિયોસ્ક તેને કેપ્ચર કરશે.',tray:'દસ્તાવેજ સ્કેનર',startScan:'સ્કેન શરૂ કરો',scanningDoc:'દસ્તાવેજ સ્કેન થઈ રહ્યો છે…',docDone:'દસ્તાવેજ કેપ્ચર થઈ ગયો',docDoneSub:'OCR દવાઓ, નિદાન અને તપાસના પરિણામો સમીક્ષા માટે કાઢશે.',reviewTitle:'મોકલતા પહેલાં તપાસો',reviewSub:'તમારી માહિતી ડૉક્ટર માટે તૈયાર કરવામાં આવશે. મુખ્ય વિગતો તપાસો.',identity:'દર્દીની ઓળખ',complaint:'મુખ્ય તકલીફ',duration:'શરૂઆત',documents:'દસ્તાવેજો',alert:'પ્રાથમિકતા ટ્રાયેજ ચેતવણી',alertSub:'શ્વાસ લેવામાં તકલીફ માટે તાત્કાલિક તપાસ જરૂરી હોઈ શકે છે. સ્ટાફની રાહ જુઓ.',ready:'તમારો મેડિકલ ઇતિહાસ તૈયાર છે',readySub:'તમારો સ્ટ્રક્ચર્ડ ઇતિહાસ પરામર્શ ટીમ માટે તૈયાર છે.',token:'ઓપીડી ટોકન',waiting:'કૃપા કરીને વેઇટિંગ એરિયામાં જાઓ.',secure:'સુરક્ષિત હેન્ડઓફ • સત્ર પૂર્ણ થયા પછી અસ્થાયી ડેટા સાફ થશે.',print:'ટોકન પ્રિન્ટ કરો'}}
const text=(lang:any)=>L[lang]||L.English
export function Intro(){const {lang,set,next}=useKioskStore();const x=text(lang);return <KioskPage icon={<Languages/>} title={x.choose} sub={x.languageHint}><div className="language-cards">{[['English',x.english],['हिंदी',x.hindi],['ગુજરાતી',x.gujarati]].map(([v,label])=><button key={v} onClick={()=>set({lang:v as any})} className={`big-choice ${lang===v?'selected':''}`}><span>{label}</span><small>{v==='English'?'English':v==='हिंदी'?'Hindi':'Gujarati'}</small></button>)}</div><div className="welcome-strip"><HeartPulse size={30}/><div><b>{x.welcome}</b><span>{x.welcomeSub}</span></div></div><Button onClick={next} className="wide-next">{x.next}<ArrowRight/></Button></KioskPage>}
export function VoiceSelection(){const {lang,audio,set}=useKioskStore();const x=text(lang);return <KioskPage icon={<Volume2/>} title={x.voiceTitle} sub={x.voiceSub}><div className="symptom-grid"><button className={`big-choice symptom ${audio?'selected':''}`} onClick={()=>set({audio:true})}><Volume2 size={54} className={audio?'text-[#1E3A8A]':'text-[#1E3A8A]/50'}/><b>{x.voiceYes}</b></button><button className={`big-choice symptom ${!audio?'selected':''}`} onClick={()=>set({audio:false})}><FileText size={54} className={!audio?'text-[#1E3A8A]':'text-[#1E3A8A]/50'}/><b>{x.voiceNo}</b></button></div><Button onClick={()=>useKioskStore.getState().next()} className="wide-next">{x.next}<ArrowRight/></Button></KioskPage>}
export function Consent(){const {lang,next,consent,set}=useKioskStore();const x=text(lang);return <KioskPage icon={<ShieldCheck/>} title={x.consentTitle} sub={x.consentSub}><div className="consent-card"><div className="consent-points"><div className="consent-point"><Check size={20} className="text-[#059669]"/><span>{x.consent1}</span></div><div className="consent-point"><Check size={20} className="text-[#059669]"/><span>{x.consent2}</span></div><div className="consent-point"><Check size={20} className="text-[#059669]"/><span>{x.consent3}</span></div><div className="consent-point"><Check size={20} className="text-[#059669]"/><span>{x.consent4}</span></div></div><div className="audio-alert"><Volume2 size={24} className="text-[#D97706]"/><div><b>{x.audioExplanation}</b><span>{x.audioExplanationText}</span></div></div><label className={`consent-agree ${consent?'active':''}`}><input type="checkbox" checked={consent} onChange={(e)=>set({consent:e.target.checked})} className="consent-checkbox"/><span className="checkmark-box">{consent && <Check size={20} className="text-white"/>}</span><b>{x.agree}</b></label></div><Button onClick={next} className="wide-next" disabled={!consent}>{x.next}<ArrowRight/></Button></KioskPage>}
export function Identify(){
  const {lang, identity, idMethod, regName, regAge, regGender, set}=useKioskStore();
  const x=text(lang);
  
  const [patientIdentified, setPatientIdentified] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [idNumber, setIdNumber] = useState(() => {
    if (identity.startsWith('ABHA: ')) return identity.replace('ABHA: ', '');
    if (identity.startsWith('Aadhar: ')) return identity.replace('Aadhar: ', '');
    return '';
  });
  
  const [focusedInput, setFocusedInput] = useState<'name' | 'age' | null>(null);

  const handleType = (num: string) => {
    if (idMethod === 'abha' && idNumber.length < 14) setIdNumber(idNumber + num);
    else if (idMethod === 'aadhar' && idNumber.length < 12) setIdNumber(idNumber + num);
    else if (idMethod === 'new' && focusedInput === 'age') set({regAge: regAge + num});
  };
  
  const handleClear = () => {
    if (idMethod !== 'new') setIdNumber(idNumber.slice(0, -1));
    else if (focusedInput === 'age') set({regAge: regAge.slice(0, -1)});
  };

  const handleSubmit = () => {
    if (idMethod === 'abha' && idNumber.length === 14) {
      set({identity: 'ABHA: ' + idNumber}); 
      setPatientIdentified(true);
    } else if (idMethod === 'aadhar' && idNumber.length === 12) {
      set({identity: 'Aadhar: ' + idNumber}); 
      setPatientIdentified(true);
    } else if (idMethod === 'new' && regName && regAge && regGender) {
      set({identity: `New Reg: ${regName}, ${regAge}y, ${regGender}`});
      useKioskStore.getState().next();
    }
  };

  const handleStartScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Unable to access camera. Simulating scan instead.");
      handleSimulateScan();
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code) {
          setIsScanning(true);
          setTimeout(() => {
            if (videoRef.current && videoRef.current.srcObject) {
              const stream = videoRef.current.srcObject as MediaStream;
              stream.getTracks().forEach(track => track.stop());
            }
            setIsScanning(false);
            setCameraActive(false);
            setScanSuccess(true);
            // Simulate extracting ABHA from QR
            const randomAbha = Array.from({length: 14}, () => Math.floor(Math.random() * 10)).join('');
            setIdNumber(randomAbha);
            set({identity: 'ABHA: ' + randomAbha});
          }, 1000);
          return;
        }
      }
    }
    // Only continue if camera is still supposed to be active and we haven't found a code
    requestAnimationFrame(tick);
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      // Stop camera if active
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      setIsScanning(false);
      setCameraActive(false);
      const randomAbha = Array.from({length: 14}, () => Math.floor(Math.random() * 10)).join('');
      setIdNumber(randomAbha);
      set({identity: 'ABHA: ' + randomAbha});
      setPatientIdentified(true);
    }, 3000);
  };
  
  const handleVerifyAndContinue = () => {
    useKioskStore.getState().next();
  };

  const renderIdNumber = () => {
    const targetLength = idMethod === 'abha' ? 14 : 12;
    const chars = idNumber.split('');
    const padded = Array(targetLength).fill('-');
    for (let i = 0; i < chars.length; i++) padded[i] = chars[i];
    
    if (idMethod === 'abha') {
      return `${padded[0]}${padded[1]} - ${padded[2]}${padded[3]}${padded[4]}${padded[5]} - ${padded[6]}${padded[7]}${padded[8]}${padded[9]} - ${padded[10]}${padded[11]}${padded[12]}${padded[13]}`;
    } else {
      return `${padded[0]}${padded[1]}${padded[2]}${padded[3]} - ${padded[4]}${padded[5]}${padded[6]}${padded[7]} - ${padded[8]}${padded[9]}${padded[10]}${padded[11]}`;
    }
  };

  return (
    <KioskPage icon={<IdCard/>} title={x.idTitle} sub={x.idSub}>
      <div className="tab-container" style={{marginBottom: '20px'}}>
        <button onClick={()=>set({idMethod:'abha'})} className={`tab-btn ${idMethod==='abha'?'active':''}`}>ABHA Card</button>
        <button onClick={()=>set({idMethod:'aadhar'})} className={`tab-btn ${idMethod==='aadhar'?'active':''}`}>Aadhar Card</button>
        <button onClick={()=>set({idMethod:'new'})} className={`tab-btn ${idMethod==='new'?'active':''}`}>New Registration</button>
      </div>

      {(idMethod === 'abha' || idMethod === 'aadhar') && !patientIdentified && (
        <div className="abha-split fade">
          <div className="abha-panel" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <div className="abha-panel-header">
              <ScanLine size={20} className="text-[#1E3A8A]" />
              Scan {idMethod === 'abha' ? 'ABHA' : 'Aadhar'} Card / QR Code
            </div>
            <div className="abha-panel-body" style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              <div className="scanner-stage" style={{minHeight: '520px', width: '100%', background: '#F8FAFC', borderRadius: '12px', border: '2px dashed #CBD5E1', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '24px'}}>
                <span style={{maxWidth: '300px', textAlign: 'center', fontSize: '18px', color: '#64748B'}}>Hold your {idMethod === 'abha' ? 'ABHA' : 'Aadhar'} Card or QR code steady in front of the scanner below.</span>
                <div className="scanner-glow" style={{width: '100%', flex: 1, minHeight: '280px', borderColor: '#94A3B8', borderStyle: 'solid', background: '#F1F5F9', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', borderRadius: '16px'}}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    style={{
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', 
                      position: 'absolute', 
                      top: 0, 
                      left: 0,
                      display: cameraActive ? 'block' : 'none'
                    }}
                  />
                  {!cameraActive && !scanSuccess && (
                    <IdCard size={140} className="text-[#1E3A8A]/50" />
                  )}
                  {scanSuccess && (
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: '#10B981'}}>
                      <Check size={100} />
                      <div style={{fontSize: '24px', fontWeight: 'bold'}}>QR Scanned!</div>
                    </div>
                  )}
                  {cameraActive && <div className="scan-line" style={{position: 'absolute', top: isScanning ? '80%' : '20%', left: '0', right: '0', height: '3px', background: '#10B981', boxShadow: '0 0 16px #10B981', zIndex: 10, transition: 'top 1.5s ease-in-out', animation: isScanning ? 'scan 1.5s infinite alternate' : 'none'}}/>}
                  {!cameraActive && !scanSuccess && <div className="scan-line" style={{position: 'absolute', top: '50%', left: '8%', right: '8%', height: '3px', background: '#10B981', boxShadow: '0 0 16px #10B981', zIndex: 10}}/>}
                </div>
                {!cameraActive && !scanSuccess ? (
                  <Button variant="primary" style={{width: '100%', fontSize: '20px', padding: '16px'}} onClick={handleStartScan}>Start Camera</Button>
                ) : scanSuccess ? (
                  <div style={{width: '100%', fontSize: '20px', padding: '16px', background: '#10B981', color: 'white', textAlign: 'center', borderRadius: '12px', fontWeight: 'bold'}}>
                    Scanned successfully!
                  </div>
                ) : (
                  <div style={{width: '100%', fontSize: '20px', padding: '16px', background: isScanning ? '#10B981' : '#F1F5F9', color: isScanning ? 'white' : '#64748B', textAlign: 'center', borderRadius: '12px', fontWeight: 'bold'}}>
                    {isScanning ? 'Scanned successfully' : 'Scanning for QR Code...'}
                  </div>
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
            </div>
          </div>
          
          <div className="abha-panel" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <div className="abha-panel-header">
              <LayoutGrid size={20} className="text-[#1E3A8A]" />
              Enter {idMethod === 'abha' ? 'ABHA' : 'Aadhar'} Number
            </div>
            <div className="abha-panel-body" style={{flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px'}}>
              <div className={`abha-input-wrapper ${!idNumber ? 'empty' : ''}`} style={{fontSize: idNumber ? '30px' : '28px', padding: '0 24px', minHeight: '90px', margin: 0, height: '90px', alignItems: 'center', letterSpacing: idNumber ? '2px' : 'normal', fontWeight: 'bold', fontFamily: idNumber ? 'monospace' : 'inherit', borderRadius: '12px', whiteSpace: 'nowrap'}}>
                <span style={{flex: 1, textAlign: 'center'}}>{idNumber ? renderIdNumber() : (idMethod === 'abha' ? 'Enter 14 digits' : 'Enter 12 digits')}</span>
                {idNumber && <button onClick={handleClear} style={{background: 'none', border: 'none', color: '#EF4444', padding: '4px', marginLeft: '12px'}}><X size={36} /></button>}
              </div>
              
              <div className="numpad-grid" style={{flex: 1}}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button key={n} onClick={() => handleType(n.toString())} className="numpad-btn" style={{height: '100%', minHeight: '90px', fontSize: '36px', borderRadius: '12px'}}>{n}</button>
                ))}
                <button className="numpad-btn" style={{visibility: 'hidden'}}></button>
                <button onClick={() => handleType('0')} className="numpad-btn" style={{height: '100%', minHeight: '90px', fontSize: '36px', borderRadius: '12px'}}>0</button>
                <button onClick={handleSubmit} className="numpad-btn check-btn" disabled={idMethod === 'abha' ? idNumber.length !== 14 : idNumber.length !== 12} style={{height: '100%', minHeight: '90px', borderRadius: '12px'}}><Check size={40} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(idMethod === 'abha' || idMethod === 'aadhar') && patientIdentified && (
        <div className="abha-split fade">
          <div className="abha-panel" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <div className="abha-panel-header">
              <UserRound size={20} className="text-[#1E3A8A]" />
              Patient Details
            </div>
            <div className="abha-panel-body" style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '30px'}}>
              <div style={{background: '#ECFDF5', color: '#065F46', padding: '8px 16px', borderRadius: '30px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px'}}>
                <Check size={24} /> Patient Identified
              </div>
              <div style={{textAlign: 'center', fontSize: '24px', color: '#334155', width: '100%'}}>
                <div style={{background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '30px', marginTop: '10px'}}>
                  <div style={{color: '#94A3B8', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px'}}>Name</div>
                  <div style={{fontSize: '42px', fontWeight: 'bold', color: '#0F172A', marginBottom: '24px'}}>Kori Sahil</div>
                  
                  <div style={{display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '20px'}}>
                    <div>
                      <div style={{color: '#94A3B8', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase'}}>Age</div>
                      <div style={{fontSize: '28px', fontWeight: 'bold'}}>21</div>
                    </div>
                    <div>
                      <div style={{color: '#94A3B8', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase'}}>Gender</div>
                      <div style={{fontSize: '28px', fontWeight: 'bold'}}>Male</div>
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="primary" onClick={handleVerifyAndContinue} style={{width: '100%', marginTop: '30px', fontSize: '22px', padding: '20px'}}>Verify & Continue</Button>
            </div>
          </div>
          
          <div className="abha-panel" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <div className="abha-panel-header">
              <FileText size={20} className="text-[#1E3A8A]" />
              Previous Medical History
            </div>
            <div className="abha-panel-body" style={{flex: 1, padding: '30px', overflowY: 'auto'}}>
              <div style={{fontSize: '24px', fontWeight: 'bold', color: '#1E293B', marginBottom: '24px'}}>Demo Medical History</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                <div style={{background: '#F1F5F9', padding: '16px 20px', borderRadius: '12px'}}>
                  <div style={{fontSize: '20px', fontWeight: 'bold', color: '#3B82F6', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', marginBottom: '12px'}}>2025</div>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '18px', color: '#475569'}}>
                    <li><span style={{color: '#64748B', width: '120px', display: 'inline-block'}}>january 26</span> • Acute fever</li>
                    <li><span style={{color: '#64748B', width: '120px', display: 'inline-block'}}>june 19</span> • Cough and cold</li>
                  </ul>
                </div>
                <div style={{background: '#F1F5F9', padding: '16px 20px', borderRadius: '12px'}}>
                  <div style={{fontSize: '20px', fontWeight: 'bold', color: '#3B82F6', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', marginBottom: '12px'}}>2024</div>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '18px', color: '#475569'}}>
                    <li><span style={{color: '#64748B', width: '120px', display: 'inline-block'}}>august 14</span> • Gastric discomfort</li>
                    <li><span style={{color: '#64748B', width: '120px', display: 'inline-block'}}>july 25</span> • Upper respiratory infection</li>
                  </ul>
                </div>
                <div style={{background: '#F1F5F9', padding: '16px 20px', borderRadius: '12px'}}>
                  <div style={{fontSize: '20px', fontWeight: 'bold', color: '#3B82F6', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', marginBottom: '12px'}}>2023</div>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '18px', color: '#475569'}}>
                    <li><span style={{color: '#64748B', width: '120px', display: 'inline-block'}}>april 3</span> • Headache</li>
                    <li><span style={{color: '#64748B', width: '120px', display: 'inline-block'}}>june 14</span> • Sore throat</li>
                  </ul>
                </div>
                <div style={{background: '#F1F5F9', padding: '16px 20px', borderRadius: '12px'}}>
                  <div style={{fontSize: '20px', fontWeight: 'bold', color: '#3B82F6', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', marginBottom: '12px'}}>2022</div>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '18px', color: '#475569'}}>
                    <li><span style={{color: '#64748B', width: '120px', display: 'inline-block'}}>february 8</span> • Lower back pain</li>
                    <li><span style={{color: '#64748B', width: '120px', display: 'inline-block'}}>may 3</span> • Seasonal allergy symptoms</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {idMethod === 'new' && (
        <div className="fade" style={{display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left', maxWidth: '900px', margin: '0 auto', width: '100%'}}>
          <div className="abha-panel" style={{display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px'}}>
            <div className="inline-form-group">
              <div className="inline-form-label" style={{fontSize: '24px', marginBottom: '16px'}}>Full Name</div>
              <input 
                type="text"
                style={{padding: '24px 28px', fontSize: '28px', borderRadius: '16px', border: '2px solid #E2E8F0', width: '100%', outline: 'none'}}
                placeholder="Enter full name"
                value={regName}
                onChange={e => set({regName: e.target.value})}
                onFocus={() => setFocusedInput('name')}
              />
            </div>
            
            <div style={{display: 'flex', gap: '24px'}}>
              <div className="inline-form-group" style={{flex: 1}}>
                <div className="inline-form-label" style={{fontSize: '24px', marginBottom: '16px'}}>Age</div>
                <div className={`abha-input-wrapper ${!regAge ? 'empty' : ''}`} style={{fontSize: '28px', padding: '24px 28px', minHeight: '84px', border: focusedInput === 'age' ? '2px solid #1E3A8A' : undefined, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}} onClick={() => setFocusedInput('age')}>
                  {regAge || 'Tap to enter'}
                  {regAge && focusedInput === 'age' && <button onClick={(e) => {e.stopPropagation(); handleClear();}} style={{background: 'none', border: 'none', color: '#EF4444', padding: '4px'}}><X size={28} /></button>}
                </div>
              </div>

              <div className="inline-form-group" style={{flex: 2}}>
                <div className="inline-form-label" style={{fontSize: '24px', marginBottom: '16px'}}>Gender</div>
                <div className="inline-form-row" style={{gap: '12px', height: '84px', margin: 0}}>
                  <button onClick={() => {set({regGender: 'Male'}); setFocusedInput(null);}} className={`inline-choice ${regGender==='Male'?'selected':''}`} style={{fontSize: '26px', flex: 1, margin: 0, height: '100%'}}>Male</button>
                  <button onClick={() => {set({regGender: 'Female'}); setFocusedInput(null);}} className={`inline-choice ${regGender==='Female'?'selected':''}`} style={{fontSize: '26px', flex: 1, margin: 0, height: '100%'}}>Female</button>
                  <button onClick={() => {set({regGender: 'Other'}); setFocusedInput(null);}} className={`inline-choice ${regGender==='Other'?'selected':''}`} style={{fontSize: '26px', flex: 1, margin: 0, height: '100%'}}>Other</button>
                </div>
              </div>
            </div>
          </div>
          
          {focusedInput === 'age' && (
            <div style={{maxWidth: '400px', margin: '0 auto', width: '100%'}}>
              <div className="numpad-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button key={n} onClick={() => handleType(n.toString())} className="numpad-btn" style={{height: '80px', fontSize: '32px'}}>{n}</button>
                ))}
                <button className="numpad-btn" style={{visibility: 'hidden'}}></button>
                <button onClick={() => handleType('0')} className="numpad-btn" style={{height: '80px', fontSize: '32px'}}>0</button>
                <button onClick={() => setFocusedInput(null)} className="numpad-btn check-btn" style={{height: '80px', fontSize: '32px'}}><Check size={40} /></button>
              </div>
            </div>
          )}

          {focusedInput === 'name' && (
            <Keyboard value={regName} onChange={v => set({regName: v})} />
          )}

          <Button 
            onClick={handleSubmit} 
            disabled={!regName || !regAge || !regGender}
            className="wide-next"
            style={{marginTop: '10px', minHeight: '80px', fontSize: '28px'}}
          >
            Submit Registration <ArrowRight size={32} />
          </Button>
        </div>
      )}
    </KioskPage>
  )
}
export function Interview(){
  const {
    lang, presentComplaint, presentAnswers, presentOtherDetail, 
    pastComplaint, pastAnswers, pastOtherDetail, inputMode, set,
    currentQuestionId, conversationHistory, structuredAnswers, transcriptMessages,
    addTranscriptMessage, addConversationMessage
  } = useKioskStore();
  const x = text(lang);
  const [recording, setRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [tab, setTab] = useState<'present'|'past'>('present');
  const [focusedInput, setFocusedInput] = useState<{type: 'other'|'sub', id?: string} | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Validate form state dynamically
  useEffect(() => {
    const pValid = isFormComplete(presentComplaint, presentAnswers, PresentConditionSchema) && (presentComplaint !== 'Others' || !!presentOtherDetail);
    const paValid = isFormComplete(pastComplaint, pastAnswers, PastConditionSchema) && (pastComplaint !== 'Others' || !!pastOtherDetail);
    set({presentValid: !!pValid, pastValid: !!paValid});
  }, [presentComplaint, presentAnswers, presentOtherDetail, pastComplaint, pastAnswers, pastOtherDetail, set]);

  const startRecording = async () => {
    try {
      if (!('webkitSpeechRecognition' in window)) {
        console.error("Speech recognition not supported in this browser.");
        return;
      }
      setPendingTranscript('');
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang === 'हिंदी' ? 'hi-IN' : lang === 'ગુજરાતી' ? 'gu-IN' : 'en-US';

      recognition.onstart = () => {
        setRecording(true);
      };

      recognition.onresult = async (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        if (final) {
          setPendingTranscript(final);
          setRecording(false);
        } else if (interim) {
          setPendingTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setRecording(false);
      };

      recognition.onend = () => {
        if (!isProcessing) setRecording(false);
      };

      recognition.start();
    } catch (e) {
      console.error('Mic error:', e);
      setRecording(false);
    }
  };

  const handleConfirmTranscript = async () => {
    if (!pendingTranscript) return;
    const transcript = pendingTranscript;
    setPendingTranscript('');
    
    setIsProcessing(true);
    addTranscriptMessage('user', transcript);
    addConversationMessage('user', transcript);

    const apiLang = lang === 'हिंदी' ? 'hi' : lang === 'ગુજરાતી' ? 'gu' : 'en';
    
    try {
      const reply = await submitInterviewAnswer(
        apiLang,
        currentQuestionId || 'chief_complaint',
        transcript,
        structuredAnswers,
        conversationHistory,
        presentComplaint || transcript
      );

      if (reply.structuredAnswers) set({ structuredAnswers: reply.structuredAnswers });
      
      if (reply.type === 'question' && reply.question) {
         set({ currentQuestionId: reply.questionId || 'unknown' });
         addConversationMessage('assistant', reply.question);
         addTranscriptMessage('ai', reply.question);
         await speakText(reply.question, getTTSLang(apiLang));
      } else if (reply.type === 'complete' || reply.complete) {
         addTranscriptMessage('ai', 'Thank you, I have all the information I need.');
         await speakText('Thank you, I have all the information I need.', getTTSLang(apiLang));
         set({ presentValid: true, pastValid: true }); // Mark ready to proceed
      }
    } catch (e) {
      console.error('Voice processing error:', e);
    } finally {
      setIsProcessing(false);
    }
  };



  const stopRecording = () => {
    // WebKitSpeechRecognition stops automatically on silence or when result is returned.
    setRecording(false);
  };

  // Start with a greeting if empty
  useEffect(() => {
    if (inputMode === 'voice' && transcriptMessages.length === 0) {
      const apiLang = lang === 'हिंदी' ? 'hi' : lang === 'ગુજરાતી' ? 'gu' : 'en';
      const greeting = apiLang === 'hi' ? "आज आपको किस समस्या के लिए मदद चाहिए?" : "What problem are you experiencing today?";
      set({ currentQuestionId: 'chief_complaint' });
      addTranscriptMessage('ai', greeting);
      addConversationMessage('assistant', greeting);
      speakText(greeting, getTTSLang(apiLang));
    }
  }, [inputMode, transcriptMessages.length, lang, addTranscriptMessage, addConversationMessage, set]);

  const presentChoices=[
    ['fever','Fever',<Thermometer key="1" size={36} strokeWidth={1.5}/>],
    ['cough','Cough / Cold',<Wind key="2" size={36} strokeWidth={1.5}/>],
    ['headache','Headache',<Activity key="3" size={36} strokeWidth={1.5}/>],
    ['stomach','Stomach pain',<Activity key="4" size={36} strokeWidth={1.5}/>],
    ['body','Body pain / Injury',<Activity key="5" size={36} strokeWidth={1.5}/>],
    ['skin','Skin problem',<Hand key="6" size={36} strokeWidth={1.5}/>],
    ['chest','Chest pain',<HeartPulse key="7" size={36} strokeWidth={1.5}/>],
    ['other','Others',<X key="8" size={36} strokeWidth={1.5} className="rotate-45"/>]
  ];

  const pastChoices=[
    ['diabetes','Diabetes',<Activity key="1" size={36} strokeWidth={1.5}/>],
    ['bp','High BP (Hypertension)',<HeartPulse key="2" size={36} strokeWidth={1.5}/>],
    ['heart','Heart Disease',<HeartPulse key="3" size={36} strokeWidth={1.5}/>],
    ['asthma','Asthma / Breathing issues',<Wind key="4" size={36} strokeWidth={1.5}/>],
    ['thyroid','Thyroid problem',<Activity key="5" size={36} strokeWidth={1.5}/>],
    ['kidney','Kidney disease',<Activity key="6" size={36} strokeWidth={1.5}/>],
    ['other','Others',<X key="8" size={36} strokeWidth={1.5} className="rotate-45"/>]
  ];

  const choices = tab === 'present' ? presentChoices : pastChoices;
  const isPresent = tab === 'present';
  const activeComplaint = isPresent ? presentComplaint : pastComplaint;
  const activeAnswers = isPresent ? presentAnswers : pastAnswers;
  const activeSchema = isPresent ? PresentConditionSchema : PastConditionSchema;
  const activeQuestions = activeSchema[activeComplaint] || [];

  const handleSelect = (v:string, label:string) => {
    setFocusedInput(null);
    if(isPresent){
      set({presentComplaint:label, presentAnswers: {}, presentOtherDetail: '', redFlag:false});
    }else{
      set({pastComplaint:label, pastAnswers: {}, pastOtherDetail: ''});
    }
  };

  const handleSetAnswer = (qId:string, val:string) => {
    if(isPresent){
      const answers = {...presentAnswers, [qId]: val};
      set({presentAnswers: answers});
      
      // Red Flag Logic for Chest Pain
      if (presentComplaint === 'Chest pain') {
        const isEmergency = answers['duration'] === 'Just started' && 
          (answers['symptoms'] === 'Breathlessness' || answers['symptoms'] === 'Sweating' || answers['symptoms'] === 'Dizziness' || answers['symptoms'] === 'Nausea');
        set({redFlag: isEmergency});
      }
    }else{
      const answers = {...pastAnswers, [qId]: val};
      set({pastAnswers: answers});
    }
  };

  return <KioskPage icon={<HeartPulse/>} title={inputMode===null?"How would you like to answer?":recording?"Listening...":x.complaintTitle} sub={inputMode===null?"Choose Voice or Touch to proceed.":recording?"Your conversation is transcribed below":x.complaintSub}>
    <div className="interview-vertical">
      {inputMode===null?
        <div className="symptom-grid" style={{width:'100%',maxWidth:'600px',margin:'auto'}}>
          <button className="big-choice symptom mode-choice" onClick={()=>set({inputMode:'voice'})}><Mic size={54} className="text-[#1E3A8A]"/><b>Use Voice</b></button>
          <button className="big-choice symptom mode-choice" onClick={()=>set({inputMode:'touch'})}><LayoutGrid size={54} className="text-[#1E3A8A]"/><b>Use Touch</b></button>
        </div>
      : inputMode==='voice' ? (
        !recording ? 
          <div className="voice-ai-hero-center" style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
            {transcriptMessages.length > 0 && (
              <div className="chat-container mb-4" style={{maxHeight:'50vh', height:'400px', width: '100%', overflowY:'auto', display:'flex', flexDirection:'column'}}>
                {transcriptMessages.map((msg, i) => (
                  <div key={i} className={`chat-bubble ${msg.role === 'ai' ? 'chat-ai' : 'chat-patient'}`} style={{ fontSize: '22px', padding: '20px 24px', maxWidth: '85%' }}>{msg.content}</div>
                ))}
              </div>
            )}
            
            {pendingTranscript && !recording ? (
              <div style={{ background: '#fff', border: '2px solid #E2E8F0', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '700px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'left' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '18px', marginBottom: '12px', fontWeight: 600 }}>
                   <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }}></div>
                   {lang === 'हिंदी' ? 'आपने कहा...' : lang === 'ગુજરાતી' ? 'તમે કહ્યું...' : 'You said...'}
                 </div>
                 <div style={{ fontSize: '28px', color: '#0F172A', marginBottom: '32px', borderLeft: '4px solid #1E3A8A', paddingLeft: '16px', lineHeight: 1.4 }}>
                   {pendingTranscript}
                 </div>
                 <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                   <button onClick={startRecording} style={{ padding: '16px 28px', background: '#F1F5F9', color: '#334155', border: 'none', borderRadius: '12px', fontSize: '20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}>
                     <RefreshCw size={24}/> {lang === 'हिंदी' ? 'फिर से बोलें' : lang === 'ગુજરાતી' ? 'ફરીથી બોલો' : 'Speak Again'}
                   </button>
                   <button onClick={handleConfirmTranscript} disabled={isProcessing} style={{ padding: '16px 36px', background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 20px rgba(30,58,138,0.2)', transition: 'background 0.2s' }}>
                     {isProcessing ? <Activity size={24} className="animate-spin" /> : <Send size={24}/>} 
                     {lang === 'हिंदी' ? 'एंटर करें' : lang === 'ગુજરાતી' ? 'સબમિટ કરો' : 'Submit'}
                   </button>
                 </div>
              </div>
            ) : (
              <>
                <div className="mic-glass-container">
                  <button className="mic-button-mvp" onClick={startRecording} disabled={isProcessing}>
                    {isProcessing ? <Activity size={60} className="animate-spin text-white"/> : <Mic size={90}/>}
                  </button>
                </div>
                <div className="voice-ai-text">
                  <b>{isProcessing ? 'Thinking...' : 'Speak to MediKiosk AI'}</b>
                  <span>{isProcessing ? 'Analyzing your answer...' : 'Describe your symptoms clearly.'}</span>
                </div>
              </>
            )}
          </div>
        : <>
          <div className="chat-container" style={{maxHeight:'50vh', height:'400px', width: '100%', maxWidth: '900px', margin: '0 auto', overflowY:'auto', display:'flex', flexDirection:'column'}}>
            {transcriptMessages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role === 'ai' ? 'chat-ai' : 'chat-patient'}`} style={{ fontSize: '22px', padding: '20px 24px', maxWidth: '85%' }}>{msg.content}</div>
            ))}
            <div className="chat-ai-typing" style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444', animation: 'pulse-ring 1s infinite' }}></div>
               {pendingTranscript ? pendingTranscript : (lang === 'हिंदी' ? 'सुन रहा है...' : lang === 'ગુજરાતી' ? 'સાંભળી રહ્યું છે...' : 'Listening...')}
            </div>
          </div>
          <div className="voice-ai-active-controls">
            <div className="mic-glass-small"><button className="mic-button-small" onClick={stopRecording}><Mic size={45}/></button></div>
          </div>
        </>
      ) : (
        <>
          <div className="tab-container">
            <button onClick={()=>{setTab('present'); setFocusedInput(null);}} className={`tab-btn ${tab==='present'?'active':''}`}>Present Conditions</button>
            <button onClick={()=>{setTab('past'); setFocusedInput(null);}} className={`tab-btn ${tab==='past'?'active':''}`}>Past Conditions</button>
          </div>
          <div className="symptom-row" style={{borderTop:'none',paddingTop:0}}>
            {choices.map(([v,label,icon]) => (
              <button key={v as string} onClick={()=>handleSelect(v as string, label as string)} className={`small-choice symptom ${activeComplaint===label?'selected':''}`}>
                <span className="icon-wrap-small">{icon}</span><b>{label as string}</b>
              </button>
            ))}
          </div>
          {activeComplaint && activeComplaint !== 'None of these' && (
            <div className="inline-form">
              {activeComplaint === 'Others' && (
                <div className="inline-form-group">
                  <div className="inline-form-label">Please specify the condition:</div>
                  <input 
                    type="text"
                    style={{padding: '14px 18px', fontSize: '18px', borderRadius: '12px', border: '2px solid #E2E8F0', width: '100%', outline: 'none'}}
                    placeholder="Type here..."
                    value={isPresent ? presentOtherDetail : pastOtherDetail}
                    onChange={e => isPresent ? set({presentOtherDetail: e.target.value}) : set({pastOtherDetail: e.target.value})}
                    onFocus={() => setFocusedInput({type: 'other'})}
                  />
                  {focusedInput?.type === 'other' && <Keyboard value={isPresent ? presentOtherDetail : pastOtherDetail} onChange={v => isPresent ? set({presentOtherDetail: v}) : set({pastOtherDetail: v})} />}
                </div>
              )}
              {activeQuestions.map(q => (
                <div key={q.id} className="inline-form-group">
                  <div className="inline-form-label">{q.label}</div>
                  <div className="inline-form-row">
                    {q.options?.map(opt => (
                      <button key={opt} onClick={()=>{handleSetAnswer(q.id, opt); setFocusedInput(null)}} className={`inline-choice ${activeAnswers[q.id]===opt?'selected':''}`}>{opt}</button>
                    ))}
                  </div>
                  {q.subQuestion && activeAnswers[q.id] === q.subQuestion.triggerValue && (
                    <div className="inline-form-group" style={{marginTop: '12px'}}>
                      <div className="inline-form-label">{q.subQuestion.question.label}</div>
                      <input 
                        type="text"
                        style={{padding: '12px 16px', fontSize: '16px', borderRadius: '12px', border: '2px solid #E2E8F0', width: '100%', outline: 'none'}}
                        placeholder="Type here..."
                        value={activeAnswers[q.subQuestion.question.id] || ''}
                        onChange={e => handleSetAnswer(q.subQuestion!.question.id, e.target.value)}
                        onFocus={() => setFocusedInput({type: 'sub', id: q.subQuestion!.question.id})}
                      />
                      {focusedInput?.type === 'sub' && focusedInput.id === q.subQuestion.question.id && <Keyboard value={activeAnswers[q.subQuestion.question.id] || ''} onChange={v => handleSetAnswer(q.subQuestion!.question.id, v)} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  </KioskPage>
}
export function Documents(){const {lang,next,set}=useKioskStore();const x=text(lang);return <KioskPage icon={<FileText/>} title={x.docsTitle} sub={x.docsSub}><div className="single-choice-stack"><button className="big-choice horizontal selected" onClick={next}><ScanLine/><span>{x.yes}</span><ArrowRight/></button><button className="big-choice horizontal" onClick={()=>set({step:6})}><span>{x.no}</span><ArrowRight/></button></div></KioskPage>}
export function ScanDocument(){const {lang,set,next,docs}=useKioskStore();const x=text(lang);const [scanning,setScanning]=useState(false);const [uploading,setUploading]=useState(false);const scan=()=>{setScanning(true);setTimeout(()=>{setScanning(false);set({docs:['Medical document 1']});next()},1800)};const upload=()=>{setUploading(true);setTimeout(()=>{setUploading(false);set({docs:['Uploaded document']});next()},1500)};return <KioskPage icon={<Camera/>} title={x.scanTitle} sub={x.scanSub}><div className="document-scanner"><div className="paper-frame"><FileText size={66}/><div className="corner c1"/><div className="corner c2"/><div className="corner c3"/><div className="corner c4"/><div className="camera-line"/></div><div className="scanner-label"><ScanLine/>{scanning?x.scanningDoc:uploading?'Uploading file...':x.tray}</div></div>{(!scanning && !uploading)&&<div className="scan-actions"><Button onClick={scan} className="wide-next half-width"><ScanLine/>{x.startScan}</Button><Button onClick={upload} className="wide-next half-width secondary-btn"><Upload/>Upload File</Button></div>}</KioskPage>}
export function Review(){
  const {lang,presentComplaint,presentAnswers,presentOtherDetail,pastComplaint,pastAnswers,pastOtherDetail,identity,docs,redFlag}=useKioskStore();
  const x=text(lang);
  
  const presentQuestions = PresentConditionSchema[presentComplaint] || [];
  const pastQuestions = PastConditionSchema[pastComplaint] || [];

  return <KioskPage icon={<ShieldCheck/>} title={x.reviewTitle} sub={x.reviewSub}>
    {presentComplaint && (
      <Card className="review-card" style={{marginBottom:'16px'}}>
        <ReviewRow title={x.identity} value={identity||'Walk-in'}/>
        <ReviewRow title="Present Condition" value={presentComplaint==='Others'?(presentOtherDetail||'Others'):presentComplaint}/>
        {presentQuestions.map(q => (
          <Fragment key={q.id}>
            <ReviewRow title={q.label} value={presentAnswers[q.id] || '—'} />
            {q.subQuestion && presentAnswers[q.id] === q.subQuestion.triggerValue && (
              <ReviewRow title={q.subQuestion.question.label} value={presentAnswers[q.subQuestion.question.id] || '—'} />
            )}
          </Fragment>
        ))}
      </Card>
    )}
    {!presentComplaint && <Card className="review-card" style={{marginBottom:'16px'}}><ReviewRow title={x.identity} value={identity||'Walk-in'}/></Card>}
    {pastComplaint && (
      <Card className="review-card">
        {pastComplaint === 'None of these' ? (
          <ReviewRow title="Past Condition" value="None"/>
        ) : (
          <>
            <ReviewRow title="Past Condition" value={pastComplaint==='Others'?(pastOtherDetail||'Others'):pastComplaint}/>
            {pastQuestions.map(q => (
              <Fragment key={q.id}>
                <ReviewRow title={q.label} value={pastAnswers[q.id] || '—'} />
                {q.subQuestion && pastAnswers[q.id] === q.subQuestion.triggerValue && (
                  <ReviewRow title={q.subQuestion.question.label} value={pastAnswers[q.subQuestion.question.id] || '—'} />
                )}
              </Fragment>
            ))}
          </>
        )}
      </Card>
    )}
    <Card className="review-card" style={{marginTop:'16px'}}>
      <ReviewRow title={x.documents} value={docs.length?`${docs.length}`:'0'}/>
    </Card>
    {redFlag&&<div className="alert-box"><AlertTriangle size={32}/><div><b>{x.alert}</b><span>{x.alertSub}</span></div></div>}
  </KioskPage>
}
function ReviewRow({title,value}:{title:string;value:string}){return <div className="review-row"><span>{title}</span><b>{value}</b></div>}
export function Ready(){const {lang}=useKioskStore();const x=text(lang);return <KioskPage icon={<Check/>} title={x.ready} sub={x.readySub}><div className="ready-token"><div><small>{x.token}</small><strong>A-127</strong><b>General Medicine OPD</b></div><div className="waiting"><span>{x.waiting}</span></div></div><div className="secure-note"><ShieldCheck/>{x.secure}</div><Button variant="secondary" onClick={()=>window.print()} className="wide-next"><Printer/>{x.print}</Button></KioskPage>}
function KioskPage({icon,title,sub,children}:{icon:any;title:string;sub:string;children:any}){return <div className="kiosk-page"><Icon>{icon}</Icon><h1>{title}</h1><p className="page-sub">{sub}</p><div className="page-content">{children}</div></div>}
export const LanguageIntro=Intro
