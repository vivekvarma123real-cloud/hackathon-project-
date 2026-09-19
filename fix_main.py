import re

with open("backend/main.py", "r", encoding="utf-8") as f:
    content = f.read()

new_flows_and_questions = """COMPLAINT_FLOWS = {
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
}"""

# Replace COMPLAINT_FLOWS and PREDEFINED_QUESTIONS
pattern1 = re.compile(r"COMPLAINT_FLOWS = \{.*?\n\}\n\nPREDEFINED_QUESTIONS = \{.*?\n\}", re.DOTALL)
content = pattern1.sub(new_flows_and_questions, content)

new_get_next_question = """def get_next_question_id(current_id: str, structured_answers: Dict[str, str], complaint_category: str = "unknown") -> Optional[str]:
    \"\"\"Get the next unanswered question ID based on the specific complaint flow.\"\"\"
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
    
    return None  # All questions answered"""

# Replace get_next_question_id
pattern2 = re.compile(r"def get_next_question_id\(.*?return None  # All questions answered", re.DOTALL)
content = pattern2.sub(new_get_next_question, content)

# Replace the text generation in api/interview
old_text_gen = """    # ---- Generate the question text ----
    fallback_question = PREDEFINED_QUESTIONS.get(next_qid, {}).get(lang, f"Please tell me more about your {next_qid.replace('_', ' ')}.")
    question_text = fallback_question
    
    if next_qid == "duration":
        # Hardcode Q2 based on localization
        loc_complaint = LOCALIZED_COMPLAINTS.get(complaint_category, LOCALIZED_COMPLAINTS["unknown"])
        if lang == "hi":
            question_text = f"{loc_complaint['hi']} कब से है?"
        else:
            question_text = f"Since when have you had the {loc_complaint['en']}?"
"""

new_text_gen = """    # ---- Generate the question text ----
    question_text = PREDEFINED_QUESTIONS.get(next_qid, {}).get(lang, f"Please tell me more about your {next_qid.replace('_', ' ')}.")
"""

content = content.replace(old_text_gen, new_text_gen)

with open("backend/main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated backend/main.py successfully.")
