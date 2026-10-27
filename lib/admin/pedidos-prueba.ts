import "server-only";
import type { CartInput } from "@/lib/cart/validate";
import type { CheckoutInput } from "@/lib/checkout/schema";
import { KIT_SIZE } from "@/lib/kit/rules";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Pedidos de prueba (solo fuera de producción): un cliente inventado y uno o dos kits armados al azar con vinos
// disponibles de un mismo grupo. Los correos al "cliente" llegan a una de las bandejas del equipo, para revisarlos.

const NOMBRES = ["Ana López", "Carlos Méndez", "Lucía Herrera", "Diego Ramírez", "Sofía Castillo", "Mateo Aguilar", "Valeria Ruiz", "Andrés Torres"];
const LUGARES: { calle: string; colonia: string; cp: string; ciudad: string; estado: CheckoutInput["state"] }[] = [
  { calle: "Av. Álvaro Obregón 120", colonia: "Roma Norte", cp: "06700", ciudad: "Cuauhtémoc", estado: "Ciudad de México" },
  { calle: "Calle 60 452", colonia: "Centro", cp: "97000", ciudad: "Mérida", estado: "Yucatán" },
  { calle: "Av. Chapultepec 233", colonia: "Americana", cp: "44160", ciudad: "Guadalajara", estado: "Jalisco" },
  { calle: "Río Mississippi 49", colonia: "Del Valle", cp: "66220", ciudad: "San Pedro Garza García", estado: "Nuevo León" },
  { calle: "Av. 1 #305", colonia: "Centro", cp: "94500", ciudad: "Córdoba", estado: "Veracruz" },
];

const azar = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
/** Bandejas que reciben los correos de los pedidos de prueba (José y Rafael). */
const CORREOS_PRUEBA = ["labs.publifix@gmail.com", "raguirre@continentalmedia.com.mx"];

export function clientePrueba(): CheckoutInput {
  const nombre = azar(NOMBRES);
  const lugar = azar(LUGARES);
  return {
    name: `${nombre} (prueba)`,
    email: azar(CORREOS_PRUEBA),
    phone: `55${Math.floor(10000000 + Math.random() * 89999999)}`,
    street: lugar.calle,
    neighborhood: lugar.colonia,
    postalCode: lugar.cp,
    city: lugar.ciudad,
    state: lugar.estado,
    references: Math.random() < 0.5 ? "Portón negro, tocar el timbre" : "",
    receiver: Math.random() < 0.3 ? "Recepción del edificio" : "",
    birthdate: "1990-05-14",
    adult: true,
    invoice: Math.random() < 0.2,
    promos: Math.random() < 0.5,
    terms: true,
  };
}

/** Uno o dos kits de 6 botellas disponibles de un mismo grupo del mismo aliado. null si no hay con qué armar. */
export async function kitsPrueba(): Promise<CartInput["kits"] | null> {
  const { data, error } = await supabaseAdmin().from("productos").select("slug, grupo_id, aliado_id").eq("activo", true).eq("disponible", true);
  if (error || !data?.length) return null;
  const grupos = new Map<string, string[]>();
  for (const p of data) grupos.set(p.grupo_id, [...(grupos.get(p.grupo_id) ?? []), p.slug]);
  const grupoKeys = [...grupos.keys()];
  const kits: CartInput["kits"] = [];
  const cuantos = Math.random() < 0.3 ? 2 : 1;
  const grupo = azar(grupoKeys);
  for (let k = 0; k < cuantos; k++) {
    const vinos = grupos.get(grupo)!;
    const cuenta = new Map<string, number>();
    for (let i = 0; i < KIT_SIZE; i++) {
      const s = azar(vinos);
      cuenta.set(s, (cuenta.get(s) ?? 0) + 1);
    }
    kits.push({ items: [...cuenta.entries()].map(([slug, quantity]) => ({ slug, quantity })) });
  }
  return kits;
}
