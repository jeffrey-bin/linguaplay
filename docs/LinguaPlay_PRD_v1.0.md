# LinguaPlay

**AI-Driven Children's English Immersive Learning**

**— Product Requirements Document —**

---

- **Version:** 1.0.0
- **Date:** 2026-02-08
- **Target Users:** 3–7 years old preschool children
- **Tech Stack:** Next.js + TypeScript + AI Agent

---

## 1. Product Overview

### 1.1 Product Vision

LinguaPlay is an AI-driven immersive English learning application for preschool children (ages 3–7). Unlike traditional English education apps that prioritize grammar drills and vocabulary memorization, LinguaPlay is built on Stephen Krashen's Comprehensible Input Hypothesis and the i+1 theory, enabling children to naturally acquire everyday English listening and speaking skills through game-based interactions.

### 1.2 Core Principles

> **Comprehensible Input + i+1 Adaptive Difficulty**
>
> The AI Agent continuously monitors each child's current level (n) and generates content at exactly n+1 difficulty—new enough to promote learning, but supported by sufficient context (visuals, animations, hints) to remain comprehensible. No grammar instruction, no Chinese translation, no rote memorization.

**Design Principles**

1. **Listening First:** Follow the natural acquisition order (Listen → Understand → Speak → Read). The MVP focuses exclusively on listening comprehension.
2. **No "Class" Feeling:** The child should feel they are playing a game, not taking a lesson. No schedules, no scores, no pass/fail.
3. **Context-Driven Understanding:** Meaning is conveyed through visuals, animations, and situational cues—never through translation or word lists.
4. **Respect the Silent Period:** Children are not forced to produce output. Speaking interactions are optional and encouraged, never required.

### 1.3 Competitive Differentiation

| Dimension | Existing Products (Lingumi, etc.) | LinguaPlay |
|---|---|---|
| Content Generation | Pre-made: 200+ games, fixed content | AI-driven: dynamic, infinite scenarios |
| Personalization | Path-level (same content, different order) | Content-level (unique for each child) |
| Difficulty Adjustment | Manual stages / level gating | Real-time AI-driven i+1 per interaction |
| Content Scaling Cost | High (design + animate + voice each game) | Low (new scene = new assets + prompts) |
| Interaction Model | Structured lessons with clear start/end | Free-play game with no "class" feeling |

---

## 2. Target Users

### 2.1 User Profiles

| Role | Age / Profile | Core Need |
|---|---|---|
| Primary User | 3–7 year old children | Fun game experience (child doesn't know they're learning) |
| Decision Maker | Parents (25–40 years old) | Visible progress, safe content, limited screen time |
| Potential Payer | Parents | Affordable alternative to tutoring ($100+/mo) |

### 2.2 Usage Scenario

A typical session lasts 5–10 minutes. The child opens the app, enters a game scene (e.g., Little Kitchen), hears English instructions, and interacts by tapping or dragging objects. The AI silently adjusts difficulty based on behavior. After the session, the parent can view a brief progress summary showing which words were introduced and the child's comprehension rate.

---

## 3. MVP Scope — Phase 1

> **MVP Goal**
>
> Validate the core hypothesis: Can an AI Agent dynamically orchestrate comprehensible input at i+1 difficulty, delivered through a single interactive game scene, in a way that children find engaging and parents find effective?

### 3.1 Scene: Little Kitchen

The MVP ships with one scene: a cartoon kitchen where the child helps an AI character cook simple dishes. This scene was chosen because:

- Food items are concrete nouns, easy to represent visually (apple, egg, milk, bowl...)
- Cooking actions are concrete verbs, easy to animate (cut, pour, mix, put...)
- Sequential steps naturally introduce sentence structure ("First, wash the apple. Then, cut it.")
- Almost all preschool children find "playing house / cooking" intrinsically motivating

### 3.2 Three-Layer Architecture

#### Layer 1: Asset Layer (Static, Pre-built)

All visual and audio assets are prepared in advance. No real-time AI generation of media.

| Asset Type | Quantity (MVP) | Source | Format |
|---|---|---|---|
| Food / utensil illustrations | 40–50 items | AI image generation (Midjourney / SD), unified cartoon style | PNG with transparent background |
| Action animations | 8–10 types | Lottie animations or CSS/Canvas animations | Lottie JSON / CSS |
| Kitchen background | 1 scene | AI image generation | PNG / SVG |
| Audio: word-level | 40–50 words | TTS (OpenAI TTS / ElevenLabs), child-friendly voice | MP3 / WAV |
| Audio: sentence-level | Dynamic | TTS real-time generation, with caching | MP3 stream |

#### Layer 2: Orchestration Layer (AI Agent Core)

The AI Agent does NOT generate visuals or audio content. It makes pedagogical decisions: what instruction to give next, based on the child's current state.

**Input (Child State):**

| Field | Type | Example | Description |
|---|---|---|---|
| known_words | string[] | ["apple", "banana", "cut", "put"] | Words the child has demonstrated understanding of |
| introduced_words | string[] | ["bowl", "pour"] | Words shown but not yet confirmed understood |
| current_scene | string | "kitchen" | Active game scene |
| recent_accuracy | number | 0.75 | Correct response rate over last 10 interactions |
| hint_count | number | 2 | How many hints were needed in current round |
| session_duration_sec | number | 180 | Time elapsed in current session |

**Output (Orchestration Instruction):**

The Agent returns a structured JSON object that the frontend consumes directly:

```json
{
  "instruction_text": "Put the banana in the bowl",
  "instruction_audio_url": "/tts/put-banana-in-bowl.mp3",
  "target_items": ["banana", "bowl"],
  "new_word": "bowl",
  "known_words_used": ["banana", "put"],
  "expected_action": {
    "type": "drag",
    "source": "banana",
    "target": "bowl"
  },
  "hint_strategy": {
    "level_1": "glow_target",
    "level_2": "arrow_guide",
    "level_3": "show_fallback_audio"
  },
  "fallback_instruction": "Look! The round thing!",
  "difficulty_score": 0.6
}
```

**Decision Logic (Prompt Core Rules):**

- Every instruction must contain at most 1 new word (n+1); all other words must come from known_words
- New words must be concrete (representable by an image in the asset library) and relevant to current scene
- If recent_accuracy < 0.5, reduce difficulty: use shorter sentences, only known words, provide more visual cues
- If recent_accuracy > 0.85 for 5+ consecutive interactions, introduce a new word
- After 3 failed attempts on the same instruction, switch to fallback (simpler phrasing + stronger visual hints)
- Session should not exceed 10 minutes; after 8 minutes, begin wind-down (simpler tasks, positive reinforcement)

#### Layer 3: Interaction Layer (Frontend)

The frontend is a React-based interactive canvas that renders the game scene, plays audio, handles child input, and reports behavioral data back to the Agent.

| Component | Technology | Responsibility |
|---|---|---|
| Game Canvas | React + PixiJS (or Canvas API) | Render scene, items, animations; handle tap/drag interactions |
| Audio Engine | Web Audio API + TTS cache | Play instruction audio, sound effects; manage audio queue |
| Behavior Tracker | Custom event system | Record tap accuracy, response time, hint usage, retry count |
| State Manager | React Context / Zustand | Maintain session state, sync with backend user model |
| Parent Dashboard | React page (separate route) | Show progress summary, vocabulary growth, session history |

### 3.3 Interaction Flow

The following describes the core game loop for one round of interaction:

1. **Session Start:** Child enters Little Kitchen scene. Frontend sends current child state to AI Agent.
2. **Agent Orchestration:** AI Agent evaluates state, selects vocabulary targets, generates 3–5 instruction objects (batch call to reduce latency).
3. **Instruction Playback:** Frontend renders the first instruction — plays audio, highlights relevant items on canvas.
4. **Child Interaction:** Child taps or drags items. Frontend records the action and timing.
5. **Feedback:** Correct → positive animation + sound + move to next instruction. Incorrect → escalating hints (glow → arrow → simplified audio).
6. **State Update:** Frontend updates known_words / introduced_words / accuracy based on response.
7. **Next Round:** After 3–5 instructions, frontend sends updated state to Agent for next batch.
8. **Session End:** After ~10 minutes or parent-triggered exit, show a brief summary screen.

### 3.4 AI Agent Technical Specifications

**API Call Strategy**

| Aspect | Specification |
|---|---|
| Model | Claude Haiku / GPT-4o-mini (cost-optimized for high-frequency, low-complexity decisions) |
| Call Frequency | Once per round (3–5 instructions per call); ~6–8 calls per 10-min session |
| Input Tokens | ~500–800 per call (child state + system prompt) |
| Output Tokens | ~300–500 per call (structured JSON array) |
| Estimated Cost | ~$0.001–0.003 per session; < $0.10 per user per month |
| Latency Target | < 2 seconds per orchestration call |
| Output Format | Strict JSON schema with function calling / structured output mode |
| Error Handling | On malformed output → retry once; on second failure → use cached fallback instructions |

**Caching Strategy**

- **TTS Audio:** Cache generated sentence audio by text hash. Same sentence = same audio file, no re-generation.
- **Instruction Templates:** Cache Agent output by (scene + difficulty_level + vocabulary_set) key. Similar-level children can reuse cached orchestrations.
- **Asset Mapping:** Maintain a local lookup table mapping word → image_path / animation_id. Agent only outputs word strings; frontend resolves to assets.

### 3.5 User Model (Data Schema)

| Field | Type | Description |
|---|---|---|
| child_id | UUID | Unique identifier |
| age | number | Age in years (used for initial difficulty calibration) |
| known_words | WordEntry[] | Array of { word, scene, first_seen, times_correct, last_seen } |
| introduced_words | WordEntry[] | Words shown but not yet "mastered" (< 3 correct responses) |
| session_history | Session[] | Array of { date, duration, words_introduced, words_mastered, accuracy } |
| preferences | object | { favorite_foods: string[], avg_session_length: number } |

A word is considered "mastered" (moved from introduced to known) when the child responds correctly to it in 3 different contexts across at least 2 sessions.

### 3.6 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend Framework | Next.js 14 + TypeScript | App Router, Server Components for parent dashboard |
| Game Rendering | PixiJS or React Canvas | 2D interactive canvas with sprite-based animations |
| Animation | Lottie / CSS Animation | Pre-built animation sequences for cooking actions |
| State Management | Zustand | Lightweight, TypeScript-friendly |
| Audio | Web Audio API + Howler.js | Audio playback, queue management, caching |
| AI Agent Backend | Next.js API Routes | Proxy to Claude/GPT API with structured output |
| TTS | OpenAI TTS API / ElevenLabs | Child-friendly voice, with local caching |
| Database | PostgreSQL + Prisma | User model, session history, vocabulary progress |
| Asset Storage | Local / S3 | Static images, animations, cached audio files |
| Deployment | Vercel + PlanetScale / Supabase | Frontend + serverless API + managed database |

---

## 4. Phase 2 Plan — Multi-Scene + RAG

> **Phase 2 Goal**
>
> Expand from 1 scene to 10+ scenes, introduce a RAG-powered knowledge base for vocabulary management, and enable cross-scene vocabulary reinforcement.

### 4.1 New Scenes (Examples)

| Scene | Core Vocabulary Domain | Core Actions | Target Sentence Patterns |
|---|---|---|---|
| Pet Shop | Animals, body parts, colors | Feed, wash, brush, pick up | "Feed the brown dog" "The cat is sleeping" |
| Craft Table | Colors, shapes, tools | Cut, glue, draw, fold | "Draw a big red circle" |
| Playground | Body movements, spatial | Run, jump, slide, climb | "Climb up the ladder" |
| Clothing Store | Clothes, colors, sizes | Wear, take off, try on | "Put on the blue hat" |
| Garden | Plants, weather, insects | Water, plant, dig, pick | "Water the small flower" |

### 4.2 RAG Knowledge Base

When expanding to 10+ scenes with hundreds of vocabulary items, the AI Agent needs a structured knowledge base to make intelligent cross-scene decisions. This is where RAG (Retrieval-Augmented Generation) becomes essential.

**What the RAG System Stores**

- **Vocabulary Entries:** word, phonetic difficulty, age-appropriateness, concrete/abstract classification, associated scenes, related words (semantic clusters)
- **Sentence Pattern Templates:** pattern structures (e.g., "Verb + the + Adj + Noun") with difficulty ratings and scene compatibility
- **Pedagogical Rules:** vocabulary progression sequences, prerequisite relationships (e.g., learning "pour" requires knowing "cup"), spaced repetition intervals
- **Cross-Scene Bridges:** which words learned in Kitchen can be reinforced in Garden (e.g., "water", "wash"), enabling deliberate vocabulary transfer

**How RAG Changes the Agent**

In Phase 1, the Agent's vocabulary knowledge is embedded in the system prompt. In Phase 2, the Agent queries the vector knowledge base before generating instructions:

1. Agent receives child state (known_words, current_scene: "garden")
2. Agent queries RAG: "Retrieve vocabulary items suitable for garden scene, difficulty level 2–3, not yet in child's known_words"
3. RAG returns ranked candidates: [water, flower, dig, seed, grow...]
4. Agent also queries: "Which words from kitchen scene can be reinforced in garden?" → [water, wash, pour]
5. Agent generates instructions that mix new garden words with reinforcement of kitchen words

**Technical Implementation**

| Component | Technology | Purpose |
|---|---|---|
| Vector Database | Pinecone / Weaviate / pgvector | Store vocabulary embeddings for semantic retrieval |
| Embedding Model | text-embedding-3-small (OpenAI) | Convert vocabulary entries and queries to vectors |
| Retrieval API | Custom API endpoint | Accept query (scene, difficulty, exclusions) → return ranked candidates |
| Knowledge Ingestion | Admin pipeline | Parse curriculum data into structured entries + embeddings |

---

## 5. Phase 3 Plan — Multi-Agent + Voice Interaction

> **Phase 3 Goal**
>
> Introduce multi-Agent collaboration for comprehensive learning management, add voice interaction (speaking practice), and connect external services via MCP protocol.

### 5.1 Multi-Agent Architecture

Phase 3 decomposes the single monolithic Agent into 4 specialized Agents that collaborate through a workflow orchestration system (LangGraph):

| Agent | Responsibility | Trigger | Output |
|---|---|---|---|
| Assessment Agent | Analyze child's weekly data; identify weak areas, learning velocity, interest patterns | End of each week / manual trigger | Assessment Report: weak_words[], strong_areas[], recommended_focus |
| Planning Agent | Generate weekly learning plan based on assessment; allocate vocabulary targets per scene per day | After Assessment Agent completes | Weekly Plan: day[] → { scene, target_words[], reinforcement_words[], estimated_difficulty } |
| Orchestration Agent | Real-time instruction generation (current Phase 1 Agent, enhanced) | Each game session | Instruction JSON (same as Phase 1, but guided by Planning Agent's targets) |
| Content Agent | Generate new assets when existing library lacks items; call image/audio generation APIs | When Orchestration Agent requests an item not in asset library | New asset files (images, audio) + updated asset registry |

**Agent Workflow (LangGraph State Machine)**

- **Weekly Cycle:** Assessment Agent → Planning Agent → store plan in database
- **Session Cycle:** Load plan → Orchestration Agent generates instructions → if asset missing → Content Agent
- **Human-in-the-Loop:** Parent can review and override weekly plan (e.g., "skip animal vocabulary, my child is scared of dogs")
- **Checkpointing:** Each Agent's state is persisted; if a session is interrupted, it resumes from last checkpoint

### 5.2 Voice Interaction (Speaking Practice)

Phase 3 introduces optional speaking interaction, following the principle of respecting the Silent Period. Children are never forced to speak; voice activities are presented as fun bonus interactions.

**Voice Pipeline**

| Step | Service | Function |
|---|---|---|
| 1. Capture | Web Speech API / MediaRecorder | Record child's voice input |
| 2. Transcribe | Whisper API (OpenAI) | Convert speech to text |
| 3. Evaluate | Pronunciation scoring API | Score phoneme-level accuracy (optional, not gatekeeping) |
| 4. Respond | AI Agent + TTS | Generate contextual response and play back as character voice |

**Design Principles for Voice**

- Voice interactions are presented as "talking to a character", not "pronunciation drills"
- Character responds meaningfully even to imperfect speech (e.g., child says "appo", character responds "Yes! Apple! Good job!")
- No red/green scoring on pronunciation; feedback is always positive and contextual
- Voice feature is unlocked only after sufficient listening exposure (configurable threshold)

### 5.3 MCP Integration

The Model Context Protocol (MCP) enables the Agent system to connect with external services through a standardized interface:

| MCP Server | Function | Used By |
|---|---|---|
| TTS MCP Server | Standardized text-to-speech generation across multiple providers | Orchestration Agent, Content Agent |
| Whisper MCP Server | Speech-to-text for voice interaction pipeline | Voice Interaction module |
| Image Generation MCP Server | Generate new scene assets on demand (Stable Diffusion / DALL-E) | Content Agent |
| Analytics MCP Server | Send learning data to external analytics platform | Assessment Agent |

---

## 6. Phased Roadmap

| Phase | Duration | Deliverables | AI Agent Capabilities |
|---|---|---|---|
| Phase 1: MVP | 6–8 weeks | 1 scene (Kitchen), core game loop, parent dashboard, basic user model | Structured Output, Prompt Engineering, Simple State Management |
| Phase 2: Scale | 8–12 weeks | 10+ scenes, cross-scene vocabulary, knowledge base, advanced analytics | RAG (Vector Retrieval), Semantic Search, Curriculum Knowledge Base |
| Phase 3: Multi-Agent | 12–16 weeks | Multi-agent workflow, voice interaction, MCP integration, content auto-generation | Multi-Agent Orchestration (LangGraph), MCP, Tool Use, Evaluation System |

---

## 7. MVP Acceptance Criteria

- Child can complete a 5–10 minute interactive session in the Kitchen scene without adult assistance
- AI Agent correctly implements i+1 rule: each instruction contains at most 1 new word with all other words from child's known vocabulary
- Hint escalation system works: glow → arrow → simplified audio, triggered by consecutive failures
- Difficulty adjusts in real-time: accuracy < 50% triggers easier instructions; accuracy > 85% triggers new vocabulary introduction
- TTS audio caching reduces repeat API calls by at least 70%
- Agent orchestration latency < 2 seconds (time from state submission to instruction JSON received)
- User model persists across sessions: child's vocabulary progress is maintained on return visits
- Parent dashboard displays: words learned, session count, average accuracy, vocabulary growth trend
- Token cost per session stays within $0.001–0.003 budget using Haiku/4o-mini tier models

---

## 8. Appendix

### 8.1 MVP Vocabulary List (Kitchen Scene, Initial Set)

| Category | Words |
|---|---|
| Fruits | apple, banana, orange, strawberry, grape, watermelon, lemon, pear |
| Vegetables | carrot, tomato, potato, corn, broccoli |
| Dairy / Protein | milk, egg, cheese, butter, chicken |
| Utensils | bowl, cup, plate, spoon, fork, knife, pan, pot |
| Actions | cut, pour, mix, put, wash, cook, eat, drink, open, close |
| Adjectives | big, small, hot, cold, red, yellow, green |

### 8.2 Theoretical References

- Krashen, S. (1982). *Principles and Practice in Second Language Acquisition.* Pergamon Press.
- Krashen, S. (1985). *The Input Hypothesis: Issues and Implications.* Longman.
- Vygotsky, L.S. (1978). *Mind in Society: The Development of Higher Psychological Processes.* Harvard University Press.
- CPA Approach (Concrete–Pictorial–Abstract): Jerome Bruner's work on representation in learning.

### 8.3 Glossary

| Term | Definition |
|---|---|
| Comprehensible Input | Language input that is understandable to the learner through context, even if not every word is known |
| i+1 / n+1 | Input that is slightly above the learner's current level, promoting acquisition without overwhelming |
| Silent Period | Natural phase where language learners absorb input before producing output; forcing speech is counterproductive |
| RAG | Retrieval-Augmented Generation: enhancing LLM responses with retrieved knowledge from a vector database |
| MCP | Model Context Protocol: standardized protocol for AI agents to connect with external tools and data sources |
| Function Calling | LLM capability to output structured data conforming to a predefined schema, enabling programmatic consumption |
| Scaffolding | Temporary support provided to a learner to achieve tasks beyond their independent ability |

---

*End of Document*
