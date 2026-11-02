// Apartado en curso, guardado en el navegador: solo el id del pedido, su llave y la huella del carrito con que se
// apartó (nunca datos personales). Si el navegador no deja guardar, el apartado vive mientras la pestaña esté abierta.

export type ApartadoGuardado = { id: string; token: string; huella: string };

const KEY = "vv_apartado_v1";
let memoria: ApartadoGuardado | null = null;

export function leerApartado(): ApartadoGuardado | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return memoria;
    const x = JSON.parse(raw);
    return x && typeof x.id === "string" && typeof x.token === "string" && typeof x.huella === "string" ? { id: x.id, token: x.token, huella: x.huella } : null;
  } catch {
    return memoria;
  }
}

export function guardarApartado(a: ApartadoGuardado) {
  memoria = a;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    // Sin almacenamiento: queda en memoria.
  }
}

export function borrarApartado() {
  memoria = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nada que borrar.
  }
}
