/**
 * LinguaPlay - TTS Cache API Route
 * 
 * Next.js API Route: /api/tts
 * 
 * Handles sentence-level TTS with caching:
 *   1. Receives text → generates hash key
 *   2. Checks local cache → if hit, returns cached audio
 *   3. If miss → calls OpenAI TTS API → caches result → returns audio
 * 
 * Usage:
 *   POST /api/tts
 *   Body: { "text": "Put the banana in the bowl", "speed": 0.85 }
 *   Returns: audio/mpeg stream
 * 
 *   GET /api/tts?text=Put+the+banana+in+the+bowl
 *   Returns: audio/mpeg stream
 * 
 * File: app/api/tts/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import path from "path";

// ============================================================
// Configuration
// ============================================================

const TTS_MODELS = ["gpt-4o-mini-tts", "tts-1", "tts-1-hd"] as const;

const TTS_CONFIG = {
  model: process.env.TTS_MODEL || TTS_MODELS[0],
  voice: "nova",
  defaultSpeed: 0.85,
  format: "mp3" as const,
  instructions:
    "You are speaking to a young child aged 3-7 who is learning English. " +
    "Speak slowly, clearly, and warmly. Enunciate each syllable distinctly. " +
    "Use a friendly, encouraging, slightly playful tone.",
  cacheDir: "public/audio/cache",
  maxTextLength: 200,
};

// ============================================================
// Cache helpers
// ============================================================

function getCacheKey(text: string, speed: number): string {
  const normalized = text.toLowerCase().trim();
  const hash = createHash("md5")
    .update(`${normalized}|${speed}|${TTS_CONFIG.voice}`)
    .digest("hex");
  return hash;
}

async function getCachedAudio(cacheKey: string): Promise<Buffer | null> {
  const cachePath = path.join(process.cwd(), TTS_CONFIG.cacheDir, `${cacheKey}.mp3`);
  try {
    await access(cachePath);
    return await readFile(cachePath);
  } catch {
    return null;
  }
}

async function setCachedAudio(cacheKey: string, buffer: Buffer): Promise<void> {
  const cacheDir = path.join(process.cwd(), TTS_CONFIG.cacheDir);
  await mkdir(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, `${cacheKey}.mp3`);
  await writeFile(cachePath, buffer);
}

// ============================================================
// OpenAI TTS call
// ============================================================

async function callTTS(text: string, speed: number): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  // Try primary model, then fall back to alternatives
  const modelsToTry = [
    TTS_CONFIG.model,
    ...TTS_MODELS.filter((m) => m !== TTS_CONFIG.model),
  ];

  let lastError = "";
  for (const model of modelsToTry) {
    const supportsInstructions = model === "gpt-4o-mini-tts";
    const body: Record<string, unknown> = {
      model,
      voice: TTS_CONFIG.voice,
      input: text,
      speed,
      response_format: TTS_CONFIG.format,
    };
    if (supportsInstructions) {
      body.instructions = TTS_CONFIG.instructions;
    }

    const response = await fetch(`${baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }

    lastError = await response.text();
    console.warn(`TTS model "${model}" failed (${response.status}), trying next...`);
  }

  throw new Error(`All TTS models failed. Last error: ${lastError}`);
}

// ============================================================
// API Route handlers
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, speed = TTS_CONFIG.defaultSpeed } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'text' field" },
        { status: 400 }
      );
    }

    if (text.length > TTS_CONFIG.maxTextLength) {
      return NextResponse.json(
        { error: `Text exceeds maximum length of ${TTS_CONFIG.maxTextLength} characters` },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = getCacheKey(text, speed);
    let audioBuffer = await getCachedAudio(cacheKey);
    let cacheHit = true;

    if (!audioBuffer) {
      cacheHit = false;
      audioBuffer = await callTTS(text, speed);
      // Cache in background (don't block response)
      setCachedAudio(cacheKey, audioBuffer).catch(console.error);
    }

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache": cacheHit ? "HIT" : "MISS",
        "X-Cache-Key": cacheKey,
      },
    });
  } catch (error: any) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");
  const speed = parseFloat(searchParams.get("speed") || String(TTS_CONFIG.defaultSpeed));

  if (!text) {
    return NextResponse.json(
      { error: "Missing 'text' query parameter" },
      { status: 400 }
    );
  }

  if (text.length > TTS_CONFIG.maxTextLength) {
    return NextResponse.json(
      { error: `Text exceeds maximum length of ${TTS_CONFIG.maxTextLength} characters` },
      { status: 400 }
    );
  }

  const cacheKey = getCacheKey(text, speed);
  let audioBuffer = await getCachedAudio(cacheKey);
  let cacheHit = true;

  if (!audioBuffer) {
    cacheHit = false;
    try {
      audioBuffer = await callTTS(text, speed);
      setCachedAudio(cacheKey, audioBuffer).catch(console.error);
    } catch (error: any) {
      console.error("TTS API error:", error);
      return NextResponse.json(
        { error: error.message || "TTS generation failed" },
        { status: 500 }
      );
    }
  }

  return new NextResponse(new Uint8Array(audioBuffer), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Cache": cacheHit ? "HIT" : "MISS",
    },
  });
}
