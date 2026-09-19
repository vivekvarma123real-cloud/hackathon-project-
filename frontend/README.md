# MediKiosk 3.0 — SIH 2026 Kiosk Frontend

A kiosk-first redesign of MediKiosk based on the supplied SIH 2026 problem statement and the existing frontend. The redesign intentionally replaces the website-like multi-card layout with a guided, one-task-per-screen patient flow.

## Stack
- Next.js + TypeScript
- Tailwind CSS
- Zustand
- shadcn/ui-compatible primitives / Radix Slot patterns
- Lucide icons

## Patient flow
1. Welcome — language, audio assistance, speak/touch preference
2. Consent — simple consent-first explanation
3. Identify — ABHA QR / 14-digit ABHA / Aadhaar-OTP / new walk-in
4. Clinical interview — voice/touch, adaptive-question placeholder, red-flag alert
5. Documents — scanner/OCR placeholder and medical timeline
6. Review — physician-ready structured history draft
7. Ready — consultation handoff, token and secure session completion

## Run
```bash
npm install
npm run dev
```

The UI is frontend-only; actual ASR, OCR, ABHA/FHIR, HIS and secure backend integrations should be connected to the existing APIs/backend.
