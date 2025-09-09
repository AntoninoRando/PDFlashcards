
export function playRecallSound() {
    let audioCtx: AudioContext | null = null;
    try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return; // Browser doesn't support Web Audio
        if (!audioCtx) audioCtx = new Ctx();

        const ctx = audioCtx;
        const duration = 0.18; // seconds
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // A quick falling tone with a soft attack/decay
        osc.type = "sine";
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + duration);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
        osc.onended = () => {
            try {
                osc.disconnect();
                gain.disconnect();
            } catch { }
        };
    } catch { }
};