# LinguaPlay

AI-Driven Children's English Immersive Learning Game

## Overview

LinguaPlay is an AI-powered immersive English learning app for preschool children (ages 3-7). Built on Krashen's Comprehensible Input Hypothesis and i+1 theory, children naturally acquire English through interactive game scenes. The MVP features a single **Little Kitchen** scene with 63 vocabulary items.

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript, Tailwind CSS)
- **Game Rendering:** PixiJS
- **State Management:** Zustand
- **Audio:** Howler.js + OpenAI TTS
- **AI Agent:** Claude Haiku / GPT-4o-mini
- **Animation:** Lottie (.lottie files)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local` and fill in your API keys:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx    # For AI Agent orchestration
OPENAI_API_KEY=sk-xxxxx           # For TTS audio generation
```

### 3. Generate word-level audio (optional)

```bash
export OPENAI_API_KEY=sk-xxxxx
node scripts/generate-tts.js
```

Audio files will be saved to `public/audio/words/` and `public/audio/sentences/`.

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── tts/route.ts              # Sentence-level TTS with caching
│   │   └── agent/orchestrate/route.ts # AI Agent orchestration endpoint
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── config/
│   └── vocabulary-map.json           # 63 vocabulary items, sprites, difficulty tiers
├── types/
│   └── game.ts                       # Shared type definitions
└── lib/                              # Utility functions

public/
├── assets/kitchen/                   # Sprite sheet, background, Lottie animations
├── audio/words/                      # Pre-generated word audio (via generate-tts.js)
├── audio/sentences/                  # Pre-generated sentence audio
└── audio/cache/                      # Runtime TTS cache

scripts/
└── generate-tts.js                   # Batch TTS audio generator

docs/
├── LinguaPlay_PRD_v1.0.md           # Product Requirements Document
└── system-prompt.yaml                # AI Agent system prompt reference
```

## API Endpoints

### POST /api/agent/orchestrate

Generates next batch of game instructions based on child's learning state.

- **Input:** `ChildState` object (known_words, accuracy, session duration, etc.)
- **Output:** 3-5 `GameInstruction` objects with interaction types, hints, and feedback

### POST /api/tts

Generates sentence-level TTS audio with MD5 hash caching.

- **Input:** `{ text: string, speed?: number }`
- **Output:** audio/mpeg stream

## Key Design Decisions

- **i+1 Principle:** Each instruction contains at most 1 new word
- **TTS Strategy:** Word-level pre-generated (~$0.01), sentence-level on-demand with caching (>70% hit rate)
- **Agent Cost:** ~$0.001-0.003 per 10-minute session using Haiku/4o-mini
- **Fallback:** Safe instructions using only known words if Agent fails
