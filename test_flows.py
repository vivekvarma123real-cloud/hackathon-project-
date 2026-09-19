import httpx
import asyncio
import time
import json
import sys

# Fix Windows console encoding for Hindi/Unicode output
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


async def run_test(name, lang, qid, answer, expected_q, history, structured=None):
    if structured is None:
        structured = {}
    
    req = {
        "sessionLanguage": lang,
        "currentQuestionId": qid,
        "latestAnswer": answer,
        "structuredAnswers": structured,
        "conversationHistory": history,
        "chiefComplaint": ""
    }
    
    print(f"\n======================================")
    print(f"{name}")
    print(f"======================================")
    print(f"Patient Answer ({lang}): '{answer}'")
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        res = await client.post("http://localhost:8000/api/interview", json=req)
        
    data = res.json()
    q_id = data.get("questionId")
    q_text = data.get("question")
    extracted = data.get("extractedInfo")
    structured_after = data.get("structuredAnswers", {})
    
    print(f"Extracted info: {extracted}")
    print(f"Selected Question ID: {q_id}")
    print(f"Selected Question Text: '{q_text}'")
    print(f"Source: COMPLAINT_FLOWS (from PREDEFINED_QUESTIONS dict in main.py)")
    print(f"State: {json.dumps(structured_after, ensure_ascii=False)}")
    
    if q_text and expected_q in q_text:
        print("✅ PASS")
    else:
        print(f"❌ FAIL (Expected to find: '{expected_q}')")

async def main():
    print("Waiting for backend server to load ASR models and be ready...")
    for i in range(60):
        try:
            async with httpx.AsyncClient(timeout=2.0) as c:
                res = await c.get("http://localhost:8000/api/health")
                if res.status_code == 200:
                    break
        except Exception:
            pass
        time.sleep(2)
            
    print("Server ready! Running tests...\n")
    
    await run_test("TEST 1", "hi", "chief_complaint", "मुझे पेट में दर्द है", "पेट में दर्द कब से है?", [])
    await run_test("TEST 2", "hi", "chief_complaint", "मुझे 2 दिन से पेट में दर्द है", "पेट में दर्द कहाँ हो रहा है?", [])
    await run_test("TEST 3", "hinglish", "chief_complaint", "Mujhe headache ho raha hai", "Headache kab se hai?", [])
    await run_test("TEST 4", "hinglish", "chief_complaint", "Mujhe 3 din se headache ho raha hai", "Sir mein dard kahan ho raha hai?", [])
    await run_test("TEST 5", "hi", "chief_complaint", "मुझे बुखार है", "बुखार कब से है?", [])
    await run_test("TEST 6", "hi", "chief_complaint", "मुझे 2 दिन से बुखार है", "बुखार लगातार रहता है या आता-जाता है?", [])
    
    # TEST 7: Khansi 4 din se hai, dry cough hai aur fever bhi hai
    await run_test("TEST 7", "hinglish", "chief_complaint", "Khansi 4 din se hai, dry cough hai aur fever bhi hai", "Agar phlegm hai, to uska color kaisa hai?", [])

if __name__ == "__main__":
    asyncio.run(main())
