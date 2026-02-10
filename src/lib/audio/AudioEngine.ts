import { Howl } from "howler";

export class AudioEngine {
  private currentSound: Howl | null = null;
  private queue: Array<{ text?: string; src: string; resolve: () => void }> =
    [];
  private isPlaying = false;
  private cache: Map<string, Howl> = new Map();
  private ttsAvailable = true;
  private destroyed = false;

  async playInstruction(text: string): Promise<void> {
    if (this.destroyed) return;
    if (this.ttsAvailable) {
      const url = `/api/tts?text=${encodeURIComponent(text)}`;
      return this.play(url, text);
    }
    return this.speakWithSynthesis(text);
  }

  async playWord(word: string): Promise<void> {
    if (this.destroyed) return;
    const url = `/audio/words/${word}.mp3`;
    return this.play(url, word);
  }

  async playFeedback(text: string): Promise<void> {
    return this.playInstruction(text);
  }

  private play(src: string, text?: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.isPlaying) {
        this.queue.push({ src, text, resolve });
        return;
      }
      this.playNow(src, resolve, text);
    });
  }

  private playNow(src: string, resolve: () => void, text?: string): void {
    this.isPlaying = true;
    let settled = false;

    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      this.isPlaying = false;
      resolve();
      this.processQueue();
    };

    // Safety timeout: resolve if audio hangs (e.g. autoplay blocked on refresh)
    const timeout = setTimeout(() => {
      if (!settled) {
        this.currentSound?.stop();
        settle();
      }
    }, 10000);

    const cached = this.cache.get(src);
    if (cached) {
      cached.once("end", settle);
      cached.play();
      this.currentSound = cached;
      return;
    }

    const sound = new Howl({
      src: [src],
      format: ["mp3"],
      html5: true,
      onend: settle,
      onloaderror: () => {
        if (src.startsWith("/api/tts")) {
          this.ttsAvailable = false;
        }
        clearTimeout(timeout);
        this.isPlaying = false;
        if (text) {
          this.speakWithSynthesis(text).then(() => {
            if (!settled) {
              settled = true;
              resolve();
              this.processQueue();
            }
          });
        } else {
          settle();
        }
      },
      onplayerror: () => {
        clearTimeout(timeout);
        this.isPlaying = false;
        if (text) {
          this.speakWithSynthesis(text).then(() => {
            if (!settled) {
              settled = true;
              resolve();
              this.processQueue();
            }
          });
        } else {
          settle();
        }
      },
    });
    this.cache.set(src, sound);
    sound.play();
    this.currentSound = sound;
  }

  private speakWithSynthesis(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }

      // Timeout: resolve even if browser silently blocks speech (no user gesture)
      const timeout = setTimeout(() => {
        window.speechSynthesis.cancel();
        resolve();
      }, 5000);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      utterance.onend = () => {
        clearTimeout(timeout);
        resolve();
      };
      utterance.onerror = () => {
        clearTimeout(timeout);
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;
    const next = this.queue.shift()!;
    if (next.text && !this.ttsAvailable && next.src.startsWith("/api/tts")) {
      this.speakWithSynthesis(next.text).then(() => {
        next.resolve();
        this.processQueue();
      });
    } else {
      this.playNow(next.src, next.resolve, next.text);
    }
  }

  prefetch(src: string): void {
    if (this.cache.has(src) || !this.ttsAvailable) return;
    const sound = new Howl({
      src: [src],
      format: ["mp3"],
      html5: true,
      preload: true,
    });
    this.cache.set(src, sound);
  }

  prefetchInstruction(text: string): void {
    if (!this.ttsAvailable) return;
    const url = `/api/tts?text=${encodeURIComponent(text)}`;
    this.prefetch(url);
  }

  stop(): void {
    this.currentSound?.stop();
    this.queue = [];
    this.isPlaying = false;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    for (const sound of this.cache.values()) {
      sound.unload();
    }
    this.cache.clear();
  }
}
