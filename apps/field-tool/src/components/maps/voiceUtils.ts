import { useEffect } from "react"

export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return []
  return window.speechSynthesis.getVoices()
}

export function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return

  window.speechSynthesis.cancel()

  const voices = getVoices()
  const voice =
    voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0]

  const u = new SpeechSynthesisUtterance(text)
  u.voice = voice
  u.lang = voice?.lang || "en-US"
  u.rate = 1
  u.pitch = 1
  u.volume = 1

  u.onstart = () => console.log("[Voice] Speaking:", text)
  u.onerror = (e) => console.error("[Voice] Error:", e.error)

  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

/** Hook that eagerly loads browser voices so they are ready when first needed. */
export function useVoicesPreload() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      console.log("[Voice] Preloaded voices:", voices.length)
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])
}
