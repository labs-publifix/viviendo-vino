"use client";

import { useState } from "react";
import { AnnouncementBar } from "@/app/_ui/AnnouncementBar";
import { Button, ButtonLink } from "@/app/_ui/Button";
import { Chip } from "@/app/_ui/Chip";
import { DarkBlock } from "@/app/_ui/DarkBlock";
import { DataBar } from "@/app/_ui/DataBar";
import { Checkbox, SelectField, TextField } from "@/app/_ui/Field";
import { Footer } from "@/app/_ui/Footer";
import { Header } from "@/app/_ui/Header";
import { KitCard, type KitLine } from "@/app/_ui/KitCard";
import { KitProgress } from "@/app/_ui/KitProgress";
import { Notice } from "@/app/_ui/Notice";
import { Price } from "@/app/_ui/Price";
import { Heading, MonoTag, NumberedLabel } from "@/app/_ui/Typography";
import { WineCard, WineCardSkeleton } from "@/app/_ui/WineCard";
import { SAMPLE_WINES } from "@/lib/catalog/sample";
import styles from "./showcase.module.css";

const bySlug = (slug: string) => {
  const wine = SAMPLE_WINES.find((w) => w.slug === slug);
  if (!wine) throw new Error(`Vino no encontrado: ${slug}`);
  return wine;
};

function kit(lines: [string, number][]): { lines: KitLine[]; totalCents: number } {
  const resolved = lines.map(([slug, quantity]) => {
    const w = bySlug(slug);
    return { name: w.name, quantity, priceCents: w.priceCents };
  });
  return { lines: resolved, totalCents: resolved.reduce((s, l) => s + l.quantity * l.priceCents, 0) };
}

const BLANCOS = kit([
  ["sauvignon-blanc-trevenezie-igt-2024", 2],
  ["pinot-grigio-delle-venezie-doc-2024", 2],
  ["falanghina-puglia-igt", 1],
  ["soave-doc-2024", 1],
]);
const BURBUJAS = kit([
  ["prosecco-doc-spumante-brut-imperial", 3],
  ["rose-extra-dry-921", 3],
]);

const SWATCHES = [
  { name: "Negro tinto", hex: "#0A0206", role: "Texto · bloques oscuros", dark: true },
  { name: "Hueso", hex: "#F3ECE4", role: "Fondo del sitio" },
  { name: "Vino", hex: "#9A2030", role: "Acento · botón sobre claro", dark: true },
  { name: "Carmín", hex: "#CF2C4B", role: "Botón sobre oscuro · foco", dark: true },
  { name: "Ciruela", hex: "#641F53", role: "Barras de dato", dark: true },
  { name: "Orquídea", hex: "#D2A5C8", role: "Datos sobre oscuro" },
];

function Section({ n, label, title, children }: { n: number; label: string; title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section} aria-labelledby={`s${n}`}>
      <NumberedLabel n={n}>{label}</NumberedLabel>
      <Heading size="subtitle" id={`s${n}`}>
        {title}
      </Heading>
      <div className={styles.content}>{children}</div>
    </section>
  );
}

export function Showcase() {
  const [filters, setFilters] = useState<string[]>(["Tintos"]);
  const [loading, setLoading] = useState(false);
  const toggle = (f: string) => setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <>
      <AnnouncementBar text="Envío incluido en todos los kits" href="/arma-tu-kit" linkLabel="Arma el tuyo" />
      <Header cartCount={2} />

      <main className={styles.main}>
        <header className={styles.intro}>
          <NumberedLabel>Sistema de diseño</NumberedLabel>
          <Heading level={1} size="section">
            Componentes.
          </Heading>
          <p className={styles.lede}>
            Muestra de cada pieza de la tienda y sus estados, con los tokens del manual de identidad. Precios reales del
            catálogo; textos de los vinos tomados del aliado (se reescribirán en voz de marca).
          </p>
        </header>

        <Section n={1} label="Color" title="Negro tinto y hueso mandan.">
          <ul className={styles.swatches}>
            {SWATCHES.map((s) => (
              <li key={s.hex}>
                <span className={styles.chipColor} style={{ background: s.hex }} />
                <strong>{s.name}</strong>
                <MonoTag>{s.hex}</MonoTag>
                <span className={styles.muted}>{s.role}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section n={2} label="Tipografía" title="Inter y JetBrains Mono.">
          <div className={styles.typeStack}>
            <Heading level={3} size="hero">
              Arma tu kit.
            </Heading>
            <Heading level={3} size="section">
              Tintos del sur.
            </Heading>
            <Heading level={3} size="subtitle">
              Seis botellas, envío incluido.
            </Heading>
            <p className={styles.body}>
              Primitivo de Manduria, en Puglia: frutos negros maduros, ciruela y pimienta negra. Cuerpo pleno, tanino
              amable.
            </p>
            <MonoTag>Primitivo · Puglia · 2023</MonoTag>
            <Price cents={60000} size="lg" />
          </div>
        </Section>

        <Section n={3} label="Botones" title="Píldora rellena o de contorno.">
          <div className={styles.row}>
            <Button>Agregar a mi kit</Button>
            <Button variant="secondary">Ver vinos</Button>
            <Button variant="link">Vaciar kit</Button>
            <Button disabled>Te falta 1</Button>
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1600);
              }}
            >
              {loading ? "Agregando…" : "Probar estado de carga"}
            </Button>
          </div>
        </Section>

        <Section n={4} label="Campos" title="Etiqueta visible, error junto al campo.">
          <div className={styles.formGrid}>
            <TextField label="Nombre completo" autoComplete="name" placeholder="Como aparece en tu identificación" />
            <TextField label="Correo" type="email" inputMode="email" defaultValue="ana@gmail" error="Revisa tu correo: falta el dominio, por ejemplo nombre@gmail.com." />
            <TextField label="Teléfono con WhatsApp" type="tel" inputMode="numeric" hint="10 dígitos, sin lada internacional." />
            <TextField label="Código postal" inputMode="numeric" disabled placeholder="Disponible en el checkout" />
            <SelectField label="Estado" defaultValue="">
              <option value="" disabled>
                Elige tu estado
              </option>
              <option>Ciudad de México</option>
              <option>Jalisco</option>
              <option>Nuevo León</option>
              <option>Veracruz</option>
            </SelectField>
            <Checkbox label="Soy mayor de 18 años." error="Para comprar debes confirmar que eres mayor de edad." />
          </div>
        </Section>

        <Section n={5} label="Chips" title="Filtros del catálogo.">
          <div className={styles.row} role="group" aria-label="Filtrar por tipo">
            {["Blancos", "Rosado", "Tintos", "Espumosos"].map((f) => (
              <Chip key={f} pressed={filters.includes(f)} onClick={() => toggle(f)}>
                {f}
              </Chip>
            ))}
            <Chip pressed={false} disabled>
              Menos de $400
            </Chip>
          </div>
        </Section>

        <Section n={6} label="Tarjeta de vino" title="Normal, en tu kit, no cabe y agotado.">
          <div className={styles.cards}>
            <WineCard wine={bySlug("pinot-grigio-delle-venezie-doc-2024")} />
            <WineCard wine={bySlug("chardonnay-vento-igt-2024")} state="in-kit" quantity={2} />
            <WineCard wine={bySlug("amarone-della-valpolicella-classico-docg-2017")} state="incompatible" />
            <WineCard wine={{ ...bySlug("rose-extra-dry-921"), available: false }} state="sold-out" />
            <WineCardSkeleton />
          </div>
        </Section>

        <Section n={7} label="Progreso del kit" title="3 de 6, siempre a la vista.">
          <div className={styles.kits}>
            <KitProgress count={0} totalCents={0} group={null} />
            <KitProgress
              count={3}
              totalCents={92500}
              group="azul"
              error="El Amarone es del grupo rojo y no cabe en este kit. Vacía el kit para cambiar de grupo."
            />
            <KitProgress count={6} totalCents={BLANCOS.totalCents} group="azul" />
          </div>
          <div className={styles.phone}>
            <MonoTag>Móvil · barra fija inferior</MonoTag>
            <KitProgress count={5} totalCents={155000} group="azul" variant="bar" />
          </div>
        </Section>

        <Section n={8} label="Tarjeta de kit" title="Kits prearmados y renglón del carrito.">
          <div className={styles.kits}>
            <KitCard name="Blancos frescos" group="azul" lines={BLANCOS.lines} totalCents={BLANCOS.totalCents} />
            <KitCard name="Burbujas" group="amarillo" lines={BURBUJAS.lines} totalCents={BURBUJAS.totalCents} />
            <KitCard name="Para la parrillada" group="azul" lines={BLANCOS.lines} totalCents={BLANCOS.totalCents} variant="cart" />
          </div>
        </Section>

        <Section n={9} label="Barra de dato" title="Perfil del vino.">
          <div className={styles.bars}>
            <DataBar label="Cuerpo" value={80} />
            <DataBar label="Tanino" value={70} />
            <DataBar label="Acidez" value={60} />
            <p className={styles.muted}>Valores de ejemplo: el aliado aún no entrega el perfil de cada vino.</p>
          </div>
        </Section>

        <Section n={10} label="Avisos" title="Un punto de color y una frase.">
          <div className={styles.notices}>
            <Notice title="Pagos disponibles pronto">Puedes revisar tu pedido; el cobro se activa el día de la apertura.</Notice>
            <Notice kind="ok" title="Kit agregado al carrito">6 botellas del grupo azul. Envío incluido.</Notice>
            <Notice kind="aviso" title="Cambió un precio">El Merlot ahora cuesta $310. Tu total se actualizó.</Notice>
            <Notice kind="error" title="No pudimos validar tu kit">Revisa que tenga 6 botellas del mismo grupo.</Notice>
          </div>
        </Section>
      </main>

      <DarkBlock aria-labelledby="dark-title">
        <div className={styles.darkDemo}>
          <NumberedLabel n={11} tone="dark">
            Bloque oscuro
          </NumberedLabel>
          <Heading level={2} size="hero" id="dark-title">
            Arma tu kit.
          </Heading>
          <p className={styles.darkLede}>Elige seis botellas. Te decimos qué es cada una y para qué sirve.</p>
          <div className={styles.row}>
            <ButtonLink href="/arma-tu-kit" tone="dark" size="lg">
              Empezar
            </ButtonLink>
            <ButtonLink href="/vinos" variant="secondary" tone="dark" size="lg">
              Ver kits armados
            </ButtonLink>
          </div>
          <MonoTag tone="dark">Kit de 6 · desde $1,800 · envío incluido</MonoTag>
        </div>
      </DarkBlock>

      <Footer />
    </>
  );
}
