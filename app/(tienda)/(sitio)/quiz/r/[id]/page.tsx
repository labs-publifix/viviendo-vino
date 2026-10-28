import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getQuizCatalog } from "@/lib/quiz/catalog";
import { buildResult } from "@/lib/quiz/result";
import { getStoredSession, isQuizId } from "@/lib/quiz/store";
import { SITE_URL } from "@/lib/site";
import { Result } from "../../Result";
import styles from "../../quiz.module.css";

// Enlace compartible de un resultado (/quiz/r/<id>): perfil y caja, con vista previa propia de cada perfil
// (/quiz/og/<perfil>). No se indexa: es el resultado de una persona. ?origen= mide de dónde llegan las visitas.

const PLACEHOLDER = "00000000-0000-4000-8000-000000000000";

export async function generateStaticParams() {
  // Al menos un parámetro (Cache Components); los resultados reales se generan al pedirlos.
  return [{ id: PLACEHOLDER }];
}

async function load(id: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("quiz-result");
  if (!storeEnabled() || !isQuizId(id) || id === PLACEHOLDER) return null;
  const session = await getStoredSession(id);
  if (!session) return null;
  const store = await getQuizCatalog();
  return buildResult(session, store.info, store.groups, store.presets);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const result = await load((await params).id);
  if (!result) return { title: "Quiz IA · Viviendo Vino", robots: { index: false } };
  const title = `Soy ${result.perfil.nombre} · Viviendo Vino`;
  const image = `${SITE_URL}/quiz/og/${result.perfil.id}`;
  return {
    title,
    description: `${result.perfil.fraseCorta} ¿Y tú? Haz el quiz y descubre tu perfil de vino.`,
    robots: { index: false, follow: true },
    openGraph: { title, description: result.perfil.fraseCorta, images: [{ url: image, width: 1200, height: 630 }], locale: "es_MX", type: "website" },
    twitter: { card: "summary_large_image", title, description: result.perfil.fraseCorta, images: [image] },
  };
}

// Dentro de <Suspense>: al renovarse la marquesina (caché del marco) la página se regenera sin conocer el id,
// y leer params fuera de un límite de Suspense hacía que respondiera 500.
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <SharedResult params={params} />
    </Suspense>
  );
}

async function SharedResult({ params }: { params: Promise<{ id: string }> }) {
  const result = await load((await params).id);
  if (!result) notFound();
  return (
    <div className={styles.page}>
      <Result result={result} compartible mode="compartido" />
    </div>
  );
}
