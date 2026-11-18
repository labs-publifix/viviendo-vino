import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import { JsonLd } from "@/app/_ui/JsonLd";
import { aplicacion, grafo, migas } from "@/lib/jsonld";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getCatalog, kitMinimo } from "@/lib/catalog/repo";
import { preguntasActuales } from "@/lib/quiz/config";
import { Quiz } from "./Quiz";
import styles from "./quiz.module.css";

// Quiz IA (/quiz): 8 preguntas → caja de 6 botellas lista para el carrito. Concepto: quiz/concepto-quiz-ia.md.
// Oculto en producción hasta la apertura: proxy.ts responde 404 y, por si acaso, storeEnabled() también.

export const metadata: Metadata = seo({
  titulo: "Quiz IA: descubre tu perfil de vino · Viviendo Vino",
  descripcion: "Dinos cómo eres y te armamos una caja de 6 vinos italianos lista para el carrito. Ocho preguntas, unos 90 segundos.",
  ruta: "/quiz",
  tituloSocial: "¿Qué perfil de vino eres? · Viviendo Vino",
  descripcionSocial: "Ocho preguntas sobre café, limonada y ocasiones. Al final, tu caja de 6 vinos.",
});

export default async function QuizPage() {
  if (!storeEnabled()) notFound();
  // Rangos de presupuesto proporcionales a los precios de hoy (si el catálogo no responde, los de base).
  const kitMin = await getCatalog().then(kitMinimo, () => null);
  const presupuesto = preguntasActuales(kitMin).preguntas.find((q) => q.id === "presupuesto")?.opciones ?? [];
  return (
    <div className={styles.page}>
      <JsonLd
        data={grafo(
          aplicacion({ nombre: "Quiz IA de Viviendo Vino", ruta: "/quiz", descripcion: "Dinos cómo eres y te armamos una caja de 6 vinos italianos lista para el carrito. Ocho preguntas, unos 90 segundos." }),
          migas([["Inicio", "/"], ["Quiz IA", "/quiz"]]),
        )}
      />
      <Quiz presupuesto={presupuesto.map((o) => ({ id: o.id, texto: o.texto }))} />
    </div>
  );
}
