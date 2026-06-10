
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

class FeedbackManager {
  private static instance: FeedbackManager;
  private audioEnabled: boolean = true;
  private hapticsEnabled: boolean = true;
  private audioContext: AudioContext | null = null;
  private soundCache: Map<string, AudioBuffer> = new Map();

  private constructor() {
    if (typeof window !== 'undefined') {
        const savedAudio = localStorage.getItem('motlatsi_audio_enabled');
        const savedHaptics = localStorage.getItem('motlatsi_haptics_enabled');
        this.audioEnabled = savedAudio !== 'false';
        this.hapticsEnabled = savedHaptics !== 'false';
    }
  }

  public static getInstance(): FeedbackManager {
    if (!FeedbackManager.instance) {
      FeedbackManager.instance = new FeedbackManager();
    }
    return FeedbackManager.instance;
  }

  // --- Haptics ---
  public async impact(style: ImpactStyle = ImpactStyle.Medium) {
    if (!this.hapticsEnabled || !Capacitor.isNativePlatform()) return;
    try {
      await Haptics.impact({ style });
    } catch (e) {
      console.warn("Haptics failed", e);
    }
  }

  public async vibrate() {
    if (!this.hapticsEnabled || !Capacitor.isNativePlatform()) return;
    try {
      await Haptics.vibrate();
    } catch (e) {
      console.warn("Vibrate failed", e);
    }
  }

  public async notification(type: NotificationType = NotificationType.Success) {
    if (!this.hapticsEnabled || !Capacitor.isNativePlatform()) return;
    try {
      await Haptics.notification({ type });
    } catch (e) {
      console.warn("Notification haptics failed", e);
    }
  }

  // --- Audio ---
  public setAudioEnabled(enabled: boolean) {
    this.audioEnabled = enabled;
    localStorage.setItem('motlatsi_audio_enabled', String(enabled));
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
    localStorage.setItem('motlatsi_haptics_enabled', String(enabled));
  }

  public isAudioEnabled() { return this.audioEnabled; }
  public isHapticsEnabled() { return this.hapticsEnabled; }

  // Simple Synthesized Tones for fallbacks/UI
  public async playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.audioEnabled) return;
    
    try {
        if (!this.audioContext) this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const ctx = this.audioContext;
        if (ctx.state === 'suspended') await ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        console.warn("Tone playback failed", e);
    }
  }

  // High-level Game Triggers
  public triggerSuccess() {
    this.notification(NotificationType.Success);
    this.playTone(880, 0.2); // A5
  }

  public triggerError() {
    this.notification(NotificationType.Error);
    this.playTone(220, 0.3, 'sawtooth'); // A3
  }

  public triggerAction() {
    this.impact(ImpactStyle.Light);
    this.playTone(440, 0.1); // A4
  }
  
  public triggerTug() {
    this.impact(ImpactStyle.Heavy);
    this.playTone(110, 0.15, 'square'); // A2 - Heavy grunt style
  }
}

export const feedback = FeedbackManager.getInstance();
