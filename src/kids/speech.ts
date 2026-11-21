/** Tarayıcının konuşma özelliğiyle Türkçe sesli okuma. Desteklenmiyorsa sessizce geçer. */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string): void {
  if (!canSpeak()) return;
  try {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'tr-TR';
    u.rate = 0.9;
    u.pitch = 1.1;
    const voice = s.getVoices().find((v) => v.lang.toLowerCase().startsWith('tr'));
    if (voice) u.voice = voice;
    s.speak(u);
  } catch {
    /* ses yok: sorun değil */
  }
}

export function stopSpeaking(): void {
  try {
    if (canSpeak()) window.speechSynthesis.cancel();
  } catch {
    /* yok say */
  }
}
