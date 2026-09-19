# MediKiosk SIH 2026 — Real Kiosk UI

A kiosk-first patient clinical intake frontend built with Next.js, TypeScript, Tailwind CSS and Zustand.

## Kiosk flow

One primary decision/action per screen:

1. Language selection
2. Voice guidance preference
3. Consent
4. ABHA card placement + scan guidance
5. Main complaint
6. Complaint duration
7. Medical document decision
8. Physical document scanner guidance
9. Review
10. Consultation-ready token

## Important UX behavior

- Large touch targets and large patient-facing typography.
- No dashboard/sidebar-style website layout.
- Gujarati, Hindi and English UI state is shared across the entire kiosk.
- Language changes immediately update the active screen and kiosk chrome.
- Every action has a clear next step.
- ABHA screen visually guides the patient to place the card in the scanner area.
- Document screen visually guides the patient to place a paper inside a scanner frame and start scanning.
- Scanner interactions are frontend demonstrations/integration points; real hospital scanner/ABHA/OCR hardware APIs must be connected separately.
- Escape/restart returns to the beginning.

## Run

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.
