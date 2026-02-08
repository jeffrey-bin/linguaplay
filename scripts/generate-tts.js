#!/usr/bin/env node

/**
 * LinguaPlay - TTS Batch Audio Generator
 * 
 * Generates word-level MP3 audio files for all vocabulary items
 * using OpenAI's gpt-4o-mini-tts model with child-friendly voice settings.
 * 
 * Usage:
 *   1. Set your OpenAI API key: export OPENAI_API_KEY=sk-xxxxx
 *   2. Run: node scripts/generate-tts.js
 *   3. Audio files will be saved to: public/audio/words/
 * 
 * Options:
 *   --voice <name>      Voice to use (default: nova)
 *   --speed <number>    Speech speed 0.25-4.0 (default: 0.85)
 *   --output <dir>      Output directory (default: public/audio/words)
 *   --dry-run           Print words without generating audio
 *   --only <category>   Only generate for a specific category (fruit, vegetable, etc.)
 */

const fs = require("fs");
const path = require("path");

// ============================================================
// Configuration
// ============================================================

const CONFIG = {
  apiUrl: "https://api.openai.com/v1/audio/speech",
  model: "gpt-4o-mini-tts",
  // "nova" is warm and friendly - good for children's content
  // alternatives: "alloy" (neutral), "shimmer" (expressive), "coral" (warm)
  voice: "nova",
  speed: 0.85, // slightly slower than normal for children
  instructions:
    "You are speaking to a young child aged 3-7 who is learning English. " +
    "Speak slowly, clearly, and warmly. Enunciate each syllable distinctly. " +
    "Use a friendly, encouraging, slightly playful tone. " +
    "Do not rush. Pause slightly between words in phrases.",
  outputDir: "public/audio/words",
  format: "mp3",
  delayBetweenCalls: 200, // ms between API calls to avoid rate limits
};

// ============================================================
// Load vocabulary map
// ============================================================

function loadVocabulary() {
  const mapPath = path.join(__dirname, "..", "config", "vocabulary-map.json");
  const data = JSON.parse(fs.readFileSync(mapPath, "utf-8"));

  const words = new Map();

  // Extract all unique words from vocabulary items
  for (const [key, item] of Object.entries(data.vocabulary)) {
    // Use the filename from audio_word path as the canonical word
    const audioFile = path.basename(item.audio_word, ".mp3");
    if (!words.has(audioFile)) {
      words.set(audioFile, {
        word: audioFile.replace(/_/g, " "),
        filename: `${audioFile}.mp3`,
        category: item.category,
        difficulty: item.difficulty,
        intro: item.intro_sentence,
      });
    }
  }

  // Extract all action words
  for (const [key, action] of Object.entries(data.actions)) {
    if (!words.has(key)) {
      words.set(key, {
        word: key,
        filename: `${key}.mp3`,
        category: "action",
        difficulty: action.difficulty,
        intro: null,
      });
    }
  }

  // Extract all adjective words
  for (const [key, adj] of Object.entries(data.adjectives)) {
    const audioFile = path.basename(adj.audio, ".mp3");
    if (!words.has(audioFile)) {
      words.set(audioFile, {
        word: audioFile.replace(/_/g, " "),
        filename: `${audioFile}.mp3`,
        category: "adjective",
        difficulty: adj.difficulty,
        intro: null,
      });
    }
  }

  return words;
}

// ============================================================
// TTS API call
// ============================================================

async function generateAudio(text, outputPath) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is not set.\n" +
      "Set it with: export OPENAI_API_KEY=sk-your-key-here"
    );
  }

  const response = await fetch(CONFIG.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CONFIG.model,
      voice: CONFIG.voice,
      input: text,
      speed: CONFIG.speed,
      instructions: CONFIG.instructions,
      response_format: CONFIG.format,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS API error (${response.status}): ${error}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  return buffer.length;
}

// ============================================================
// Sentence generation for common phrases
// ============================================================

function getCommonSentences() {
  return [
    // Basic instructions
    { text: "Find the", filename: "sentence_find_the.mp3" },
    { text: "Put the", filename: "sentence_put_the.mp3" },
    { text: "Cut the", filename: "sentence_cut_the.mp3" },
    { text: "Wash the", filename: "sentence_wash_the.mp3" },
    { text: "Cook the", filename: "sentence_cook_the.mp3" },
    { text: "Mix the", filename: "sentence_mix_the.mp3" },
    { text: "Pour the", filename: "sentence_pour_the.mp3" },
    { text: "Eat the", filename: "sentence_eat_the.mp3" },
    { text: "Open the", filename: "sentence_open_the.mp3" },

    // Prepositions
    { text: "in the bowl", filename: "sentence_in_the_bowl.mp3" },
    { text: "in the pot", filename: "sentence_in_the_pot.mp3" },
    { text: "in the pan", filename: "sentence_in_the_pan.mp3" },
    { text: "on the plate", filename: "sentence_on_the_plate.mp3" },
    { text: "on the cutting board", filename: "sentence_on_the_cutting_board.mp3" },

    // Feedback / encouragement
    { text: "Great job!", filename: "feedback_great_job.mp3" },
    { text: "Well done!", filename: "feedback_well_done.mp3" },
    { text: "Yes! That's right!", filename: "feedback_yes_right.mp3" },
    { text: "Yummy!", filename: "feedback_yummy.mp3" },
    { text: "Let's try again!", filename: "feedback_try_again.mp3" },
    { text: "Look carefully!", filename: "feedback_look_carefully.mp3" },
    { text: "Can you find it?", filename: "feedback_can_you_find.mp3" },
    { text: "Tap the", filename: "feedback_tap_the.mp3" },

    // Session flow
    { text: "Welcome to the kitchen!", filename: "session_welcome.mp3" },
    { text: "Let's cook something!", filename: "session_lets_cook.mp3" },
    { text: "What a great chef you are!", filename: "session_great_chef.mp3" },
    { text: "See you next time!", filename: "session_goodbye.mp3" },
  ];
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlyCategory = args.includes("--only")
    ? args[args.indexOf("--only") + 1]
    : null;

  // Parse optional flags
  if (args.includes("--voice")) CONFIG.voice = args[args.indexOf("--voice") + 1];
  if (args.includes("--speed")) CONFIG.speed = parseFloat(args[args.indexOf("--speed") + 1]);
  if (args.includes("--output")) CONFIG.outputDir = args[args.indexOf("--output") + 1];

  console.log("=".repeat(60));
  console.log("LinguaPlay TTS Audio Generator");
  console.log("=".repeat(60));
  console.log(`Model:  ${CONFIG.model}`);
  console.log(`Voice:  ${CONFIG.voice}`);
  console.log(`Speed:  ${CONFIG.speed}`);
  console.log(`Output: ${CONFIG.outputDir}`);
  console.log(`Format: ${CONFIG.format}`);
  if (dryRun) console.log("MODE:   DRY RUN (no API calls)");
  console.log("=".repeat(60));

  // Load vocabulary
  const words = loadVocabulary();
  const sentences = getCommonSentences();

  // Filter by category if specified
  let wordList = [...words.values()];
  if (onlyCategory) {
    wordList = wordList.filter((w) => w.category === onlyCategory);
    console.log(`\nFiltering to category: ${onlyCategory}`);
  }

  console.log(`\nWords to generate: ${wordList.length}`);
  console.log(`Sentences to generate: ${sentences.length}`);
  console.log(`Total audio files: ${wordList.length + sentences.length}\n`);

  if (dryRun) {
    console.log("--- Words ---");
    wordList.forEach((w) =>
      console.log(`  [${w.category}] ${w.word} → ${w.filename}`)
    );
    console.log("\n--- Sentences ---");
    sentences.forEach((s) => console.log(`  "${s.text}" → ${s.filename}`));
    console.log("\nDry run complete. No files generated.");
    return;
  }

  // Create output directory
  const outputDir = path.resolve(CONFIG.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  let generated = 0;
  let skipped = 0;
  let errors = 0;
  let totalBytes = 0;

  // Generate word audio
  console.log("Generating word audio...\n");
  for (const item of wordList) {
    const outputPath = path.join(outputDir, item.filename);

    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`  ⏭ ${item.word} (already exists)`);
      skipped++;
      continue;
    }

    try {
      const bytes = await generateAudio(item.word, outputPath);
      totalBytes += bytes;
      generated++;
      console.log(
        `  ✓ ${item.word} → ${item.filename} (${(bytes / 1024).toFixed(1)}KB)`
      );
    } catch (err) {
      errors++;
      console.error(`  ✗ ${item.word}: ${err.message}`);
    }

    // Rate limit delay
    await new Promise((r) => setTimeout(r, CONFIG.delayBetweenCalls));
  }

  // Generate sentence audio
  console.log("\nGenerating sentence audio...\n");
  const sentenceDir = path.join(outputDir, "..", "sentences");
  fs.mkdirSync(sentenceDir, { recursive: true });

  for (const sentence of sentences) {
    const outputPath = path.join(sentenceDir, sentence.filename);

    if (fs.existsSync(outputPath)) {
      console.log(`  ⏭ "${sentence.text}" (already exists)`);
      skipped++;
      continue;
    }

    try {
      const bytes = await generateAudio(sentence.text, outputPath);
      totalBytes += bytes;
      generated++;
      console.log(
        `  ✓ "${sentence.text}" → ${sentence.filename} (${(bytes / 1024).toFixed(1)}KB)`
      );
    } catch (err) {
      errors++;
      console.error(`  ✗ "${sentence.text}": ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, CONFIG.delayBetweenCalls));
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Generation Complete");
  console.log("=".repeat(60));
  console.log(`  Generated: ${generated} files`);
  console.log(`  Skipped:   ${skipped} files (already existed)`);
  console.log(`  Errors:    ${errors} files`);
  console.log(`  Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Output dir: ${outputDir}`);

  // Estimate cost
  const estimatedTokens = wordList.length * 5 + sentences.reduce((a, s) => a + s.text.split(" ").length, 0);
  console.log(`  Est. cost: ~$${(estimatedTokens * 0.000015).toFixed(4)} (${estimatedTokens} tokens @ TTS rate)`);
}

main().catch(console.error);
