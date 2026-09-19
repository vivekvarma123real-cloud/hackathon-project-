answer = "आज मुझे कमर दर्द है"
ans_lower = answer.lower()
parsed = {"complaint_category": "headache"}  # simulate Qwen hallucination

cat = parsed.get("complaint_category", "unknown")
if any(w in ans_lower for w in ["kamar", "कमर", "peeth", "पीठ", "back"]):
    cat = "back_pain"
elif any(w in ans_lower for w in ["pet", "पेट", "stomach"]):
    cat = "stomach_pain"
elif any(w in ans_lower for w in ["sir", "sar", "सिर", "सर", "headache"]):
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

print(f"Final cat: {cat}")
