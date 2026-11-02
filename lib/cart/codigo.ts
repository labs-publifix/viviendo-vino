// Código de descuento pendiente de aplicar (de un enlace de campaña ?codigo= o escrito en el checkout), guardado en
// el navegador. Solo el texto del código: el descuento siempre lo calcula el servidor.

const KEY = "vv_codigo_v1";
const RE = /^[A-Z0-9]{3,20}$/;

export function leerCodigo(): string | null {
  try {
    const c = window.localStorage.getItem(KEY);
    return c && RE.test(c) ? c : null;
  } catch {
    return null;
  }
}

export function guardarCodigo(codigo: string) {
  const c = codigo.replace(/[\s-]/g, "").toUpperCase();
  if (!RE.test(c)) return;
  try {
    window.localStorage.setItem(KEY, c);
  } catch {
    // Sin almacenamiento: se escribe a mano en el checkout.
  }
}

export function borrarCodigo() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nada que borrar.
  }
}
