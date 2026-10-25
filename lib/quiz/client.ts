// Utilidades del Quiz IA en el navegador: id anónimo, perfil guardado (para repetir en 2 preguntas) y eventos
// del embudo. Si el navegador no deja guardar (modo privado, almacenamiento bloqueado), todo sigue funcionando.

const SESSION_KEY = "vv_quiz_session";
const PROFILE_KEY = "vv_quiz_perfil_v1";

export type SavedProfile = {
  v: 1;
  perfil: string;
  respuestas: { colores: string[]; cafe: string; limonada: string; textura: string; aromas: string[]; aventura: string };
  fecha: string;
};

export function sessionId(): string | undefined {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export function loadProfile(): SavedProfile | null {
  try {
    const data = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
    if (data?.v !== 1 || typeof data.perfil !== "string" || !data.respuestas || !Array.isArray(data.respuestas.colores)) return null;
    return data as SavedProfile;
  } catch {
    return null;
  }
}

export function saveProfile(p: Omit<SavedProfile, "v" | "fecha">) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ v: 1, ...p, fecha: new Date().toISOString() }));
  } catch {
    // Sin almacenamiento: la próxima vez se hacen las 8 preguntas.
  }
}

export function forgetProfile() {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Nada que borrar.
  }
}

/** Origen de la visita (?origen=, ?o= o ?utm_source=), saneado como lo valida el servidor. */
export function visitOrigin(): string | undefined {
  try {
    const p = new URLSearchParams(window.location.search);
    const raw = p.get("origen") ?? p.get("o") ?? p.get("utm_source");
    return raw && /^[a-z0-9_-]{1,40}$/i.test(raw) ? raw.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

export type QuizEvent =
  | "inicio"
  | "pregunta"
  | "comentario"
  | "resultado"
  | "compartido"
  | "copiado"
  | "tarjeta"
  | "carrito"
  | "prearmado"
  | "segundo_kit"
  | "guardar"
  | "repetir"
  | "repetir_perfil"
  | "visita_compartida";

/** Evento del embudo. sendBeacon sobrevive a la navegación (por ejemplo, al ir al armador). */
export function track(tipo: QuizEvent, extra: { quiz_id?: string; pregunta?: number; origen?: string } = {}) {
  try {
    const body = JSON.stringify({ tipo, session_id: sessionId(), ...extra });
    if (navigator.sendBeacon?.("/api/quiz/event", new Blob([body], { type: "text/plain" }))) return;
    void fetch("/api/quiz/event", { method: "POST", body, keepalive: true }).catch(() => undefined);
  } catch {
    // Medir nunca debe romper el quiz.
  }
}
