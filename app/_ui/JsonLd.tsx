import type { Json } from "@/lib/jsonld";

/** Datos estructurados de la página. "<" se escapa para que ningún texto pueda cerrar la etiqueta <script>. */
export function JsonLd({ data }: { data: Json }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
