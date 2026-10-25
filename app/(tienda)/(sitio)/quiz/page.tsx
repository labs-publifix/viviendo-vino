import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { SITE_URL } from "@/lib/site";
import { Quiz } from "./Quiz";
import styles from "./quiz.module.css";

// Quiz IA (/quiz): 8 preguntas → caja de 6 botellas lista para el carrito. Concepto: quiz/concepto-quiz-ia.md.
// Oculto en producción hasta la apertura: proxy.ts responde 404 y, por si acaso, storeEnabled() también.

export const metadata: Metadata = {
  title: "Quiz IA · Viviendo Vino",
  description: "Dinos cómo eres y te armamos una caja de 6 vinos italianos lista para el carrito. Ocho preguntas, unos 90 segundos.",
  alternates: { canonical: `${SITE_URL}/quiz` },
  openGraph: { title: "¿Qué perfil de vino eres? · Viviendo Vino", description: "Ocho preguntas sobre café, limonada y ocasiones. Al final, tu caja de 6 vinos.", locale: "es_MX" },
};

export default function QuizPage() {
  if (!storeEnabled()) notFound();
  return (
    <div className={styles.page}>
      <Quiz />
    </div>
  );
}
