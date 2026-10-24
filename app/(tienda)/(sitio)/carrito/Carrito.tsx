"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import Link from "next/link";
import { Button, ButtonLink } from "@/app/_ui/Button";
import { Icon } from "@/app/_ui/Icon";
import { KitCard } from "@/app/_ui/KitCard";
import { Notice } from "@/app/_ui/Notice";
import { Price } from "@/app/_ui/Price";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { cart, useCart, type CartKit } from "@/lib/cart/store";
import type { BottleGroup } from "@/lib/catalog/types";
import { KIT_SIZE, MAX_KITS } from "@/lib/kit/rules";
import { useCartValidation } from "@/lib/cart/useCartValidation";
import styles from "./carrito.module.css";

// Carrito: los kits viven en el navegador; nombres, precios y totales los calcula el servidor con la base
// (/api/carrito/validar) cada vez que el carrito cambia.

type WineRef = { slug: string; name: string; group: BottleGroup };


export function Carrito({ wines, presets }: { wines: WineRef[]; presets: { slug: string; name: string }[] }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { kits } = useCart();
  const [added, setAdded] = useState(false);
  const bySlug = useMemo(() => new Map(wines.map((w) => [w.slug, w])), [wines]);

  // Aviso de "kit agregado" al llegar desde el armador; se limpia de la dirección.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("agregado")) return;
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee la dirección una vez al llegar
    setAdded(true);
  }, []);

  const validation = useCartValidation(kits, hydrated);

  if (!hydrated) {
    return (
      <div className={styles.page}>
        <Intro />
        <p className={styles.loading} role="status">
          Cargando tu carrito…
        </p>
      </div>
    );
  }

  if (kits.length === 0) {
    return (
      <div className={styles.page}>
        <Intro />
        <div className={styles.empty}>
          <Icon name="cart" size={32} />
          <p className={styles.emptyTitle}>Tu carrito está vacío.</p>
          <p className={styles.emptyText}>Arma un kit de {KIT_SIZE} botellas del mismo grupo o empieza con uno prearmado.</p>
          <ButtonLink href="/arma-tu-kit" size="lg">
            Arma tu kit
          </ButtonLink>
        </div>
      </div>
    );
  }

  const ready = validation.status === "done";
  const resultFor = (k: CartKit) => (ready ? validation.kits.find((r) => r.id === k.id) : undefined);
  const allValid = ready && validation.kits.length === kits.length && validation.kits.every((r) => r.ok);
  const bottles = kits.length * KIT_SIZE;

  function edit(id: string) {
    if (cart.editKit(id)) router.push("/arma-tu-kit");
  }

  return (
    <div className={styles.page}>
      <Intro />
      {added && (
        <div className={styles.notice}>
          <Notice kind="ok" title="Kit agregado a tu carrito.">
            ¿Otro? Puedes <Link href="/arma-tu-kit">armar uno más</Link>; cada kit lleva su envío incluido.
          </Notice>
        </div>
      )}

      <div className={styles.layout}>
        <ul className={styles.kits} aria-label="Kits en tu carrito">
          {kits.map((k, i) => {
            const r = resultFor(k);
            const group = (r?.ok ? r.group : bySlug.get(k.items[0]?.slug)?.group) as BottleGroup | undefined;
            const preset = k.preset ? presets.find((p) => p.slug === k.preset)?.name : undefined;
            const name = preset ?? `Kit ${i + 1}`;
            const lines = r?.ok
              ? r.lines
              : k.items.map((it) => ({ name: bySlug.get(it.slug)?.name ?? "Vino no disponible", quantity: it.quantity, priceCents: 0 }));
            return (
              <li key={k.id} className={styles.kitItem}>
                <KitCard
                  name={name}
                  group={group ?? null}
                  lines={lines}
                  totalCents={r?.ok ? r.totalCents : null}
                  variant="cart"
                  onPrimary={() => edit(k.id)}
                  onRemove={() => cart.removeKit(k.id)}
                  onDuplicate={kits.length < MAX_KITS ? () => cart.duplicateKit(k.id) : undefined}
                />
                {r && !r.ok && (
                  <Notice kind="error" title="Este kit necesita un cambio.">
                    {r.message} Usa “Editar” para corregirlo.
                  </Notice>
                )}
              </li>
            );
          })}
        </ul>

        <aside className={styles.summary} aria-labelledby="resumen-title">
          <h2 id="resumen-title" className={styles.summaryTitle}>
            Resumen
          </h2>
          <dl className={styles.rows}>
            <div>
              <dt>
                {kits.length} {kits.length === 1 ? "kit" : "kits"} · {bottles} botellas
              </dt>
              <dd>{ready ? <Price cents={validation.totalCents} size="sm" unit="" /> : "—"}</dd>
            </div>
            <div>
              <dt>Envío</dt>
              <dd className={styles.included}>Incluido</dd>
            </div>
          </dl>
          <div className={styles.total} aria-live="polite">
            <span>Total</span>
            {ready ? <Price cents={validation.totalCents} size="lg" /> : <span className={styles.calculating}>Calculando…</span>}
          </div>
          {validation.status === "error" && <Notice kind="error">{validation.error} Recarga la página para intentar de nuevo.</Notice>}
          {allValid ? (
            <ButtonLink href="/checkout" size="lg" block>
              Continuar
            </ButtonLink>
          ) : (
            <Button size="lg" block disabled>
              {ready || validation.status === "error" ? "Corrige tu carrito para continuar" : "Revisando precios…"}
            </Button>
          )}
          <p className={styles.fine}>Pago de contado. Sin cargos de envío al final.</p>
          <ButtonLink href="/arma-tu-kit" variant="secondary" block>
            Armar otro kit
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}

function Intro() {
  return (
    <header className={styles.intro}>
      <NumberedLabel>Carrito</NumberedLabel>
      <Heading level={1} size="section">
        Tu carrito.
      </Heading>
    </header>
  );
}
