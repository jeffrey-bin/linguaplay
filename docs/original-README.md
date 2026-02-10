# LinguaPlay - AI Agent Configuration Files

## Overview

This package contains all AI/data configuration files for the LinguaPlay MVP (Little Kitchen scene). These files are designed to be used with **Claude Code** or any AI-assisted development workflow to build the full Next.js application.

## File Structure

```
linguaplay/
├── config/
│   └── vocabulary-map.json      # Core data: all vocabulary, sprites, difficulty tiers
├── scripts/
│   └── generate-tts.js          # Batch TTS generator (run before first deploy)
├── api/
│   ├── tts-route.ts             # Next.js API: /api/tts (sentence TTS with caching)
│   └── agent-orchestrate-route.ts # Next.js API: /api/agent/orchestrate (AI brain)
├── agent/
│   └── system-prompt.yaml       # Agent system prompt + JSON schema (reference doc)
└── README.md                    # This file
```

## How to Use with Claude Code

### Step 1: Set up Next.js project

Tell Claude Code:
```
Create a Next.js 14 project with TypeScript, Tailwind CSS, and the App Router.
Install these dependencies: @anthropic-ai/sdk, zustand, howler, pixi.js
```

### Step 2: Copy files into project

```
config/vocabulary-map.json    → src/config/vocabulary-map.json
api/tts-route.ts              → src/app/api/tts/route.ts
api/agent-orchestrate-route.ts → src/app/api/agent/orchestrate/route.ts
```

### Step 3: Generate word-level audio

```bash
export OPENAI_API_KEY=sk-xxxxx
node scripts/generate-tts.js
# Audio files saved to public/audio/words/ and public/audio/sentences/
```

### Step 4: Build the game

Tell Claude Code to reference these files and the PRD document when building:
- The sprite sheet renderer (reads sprite_position from vocabulary-map.json)
- The game canvas component (uses PixiJS or React Canvas)
- The session state manager (Zustand store)
- The orchestration client (calls /api/agent/orchestrate)

## Key Design Decisions

### Vocabulary Map (vocabulary-map.json)
- **63 items** mapped from the actual sprite sheet (8x8 grid, 128px cells)
- Each item has `sprite_position: [row, col]` for sprite sheet extraction
- **5 difficulty tiers** define the learning progression
- `semantic_cluster` enables the Agent to group related words
- `compatible_actions` and `compatible_adjectives` constrain valid sentence generation

### TTS Strategy
- **Word-level**: Pre-generated offline via `generate-tts.js` (one-time cost ~$0.01)
- **Sentence-level**: Generated on-demand via `/api/tts` with MD5 hash caching
- **Voice**: OpenAI `nova` at 0.85x speed with child-friendly instructions
- Cache hit rate expected >70% after first week of usage per user

### Agent Orchestration
- **Model**: Claude Haiku 4.5 (Anthropic) or GPT-4o-mini (OpenAI) - both cost-optimized
- **Call frequency**: ~6-8 calls per 10-minute session (batch of 3-5 instructions per call)
- **Estimated cost**: $0.001-0.003 per session
- **Fallback**: If Agent fails, pre-built safe instructions using only known words
- **Validation**: Every Agent response is parsed and validated against vocabulary map

### Sprite Sheet
- Source: `food-and-utensil.png` (uploaded by user)
- Grid: 8 columns × 8 rows, each cell ~128×128px
- Items are referenced by `sprite_position: [row, col]` in vocabulary map
- Frontend should extract individual sprites at runtime using Canvas or CSS background-position

## Environment Variables

```env
# Required: at least one AI provider
ANTHROPIC_API_KEY=sk-ant-xxxxx    # For Agent orchestration (Claude Haiku)
OPENAI_API_KEY=sk-xxxxx           # For TTS + optional Agent fallback

# Database (for user model persistence)
DATABASE_URL=postgresql://...
```

## API Endpoints

### POST /api/agent/orchestrate
Request body: ChildState object
Response: { success, instructions: GameInstruction[], meta }

### POST /api/tts
Request body: { text: string, speed?: number }
Response: audio/mpeg binary stream

### GET /api/tts?text=Hello+world
Response: audio/mpeg binary stream
