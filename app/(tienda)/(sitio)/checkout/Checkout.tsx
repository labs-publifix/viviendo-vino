"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/app/_ui/Button";
import { Checkbox, SelectField, TextField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import { Price } from "@/app/_ui/Price";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { useCart } from "@/lib/cart/store";
import { useCartValidation } from "@/lib/cart/useCartValidation";
import { MIN_AGE, todayInMexico } from "@/lib/checkout/age";
import { MX_STATES, checkoutSchema, fieldErrors, type CheckoutField, type FieldErrors } from "@/lib/checkout/schema";
import { KIT_SIZE } from "@/lib/kit/rules";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "./checkout.module.css";

// Checkout sin pago (fase actual): datos de contacto, envío y mayoría de edad. El servidor revisa todo
// (/api/checkout/revisar) y el botón de pago queda desactivado hasta conectar Mercado Pago.
// Los datos personales no se guardan en el navegador ni en el servidor.

type Result = { kind: "ok" | "error"; text: string } | null;

const ORDER: CheckoutField[] = [
  "name", "email", "phone", "street", "neighborhood", "postalCode", "city", "state", "references", "receiver", "birthdate", "adult", "invoice", "promos", "terms",
];

function readForm(form: HTMLFormElement) {
  const f = new FormData(form);
  const str = (k: string) => String(f.get(k) ?? "");
  return {
    name: str("name"),
    email: str("email"),
    phone: str("phone"),
    street: str("street"),
    neighborhood: str("neighborhood"),
    postalCode: str("postalCode"),
    city: str("city"),
    state: str("state"),
    references: str("references"),
    receiver: str("receiver"),
    birthdate: str("birthdate"),
    adult: f.get("adult") === "on",
    invoice: f.get("invoice") === "on",
    promos: f.get("promos") === "on",
    terms: f.get("terms") === "on",
  };
}

export function Checkout() {
  const hydrated = useHydrated();
  const { kits } = useCart();
  const validation = useCartValidation(kits, hydrated);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<Result>(null);
  const [checking, setChecking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const ready = validation.status === "done";
  const cartOk = ready && validation.kits.length === kits.length && validation.kits.every((k) => k.ok);

  function focusFirst(errs: FieldErrors) {
    const first = ORDER.find((k) => errs[k]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    const data = readForm(e.currentTarget);
    const local = checkoutSchema.safeParse(data);
    if (!local.success) {
      const errs = fieldErrors(local.error);
      setErrors(errs);
      focusFirst(errs);
      return;
    }
    setErrors({});
    setChecking(true);
    try {
      const res = await fetch("/api/checkout/revisar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customer: data, kits: kits.map((k) => ({ id: k.id, items: k.items })) }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) throw new Error(body?.error ?? "No pudimos revisar tus datos. Intenta de nuevo.");
      if (body.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
        setErrors(body.fieldErrors);
        focusFirst(body.fieldErrors);
        return;
      }
      if (body.cartError) {
        setResult({ kind: "error", text: body.cartError });
        return;
      }
      setResult({ kind: "ok", text: "Tus datos están completos. Los pagos estarán disponibles pronto; no se hizo ningún cargo." });
    } catch (err) {
      setResult({ kind: "error", text: err instanceof Error ? err.message : "No pudimos revisar tus datos. Intenta de nuevo." });
    } finally {
      setChecking(false);
    }
  }

  const clear = (k: CheckoutField) => () => errors[k] && setErrors((e) => ({ ...e, [k]: undefined }));

  if (!hydrated) {
    return (
      <div className={styles.page}>
        <Intro />
        <p className={styles.muted} role="status">
          Cargando tu pedido…
        </p>
      </div>
    );
  }

  if (kits.length === 0) {
    return (
      <div className={styles.page}>
        <Intro />
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Tu carrito está vacío.</p>
          <p className={styles.muted}>Arma un kit de {KIT_SIZE} botellas para continuar.</p>
          <ButtonLink href="/arma-tu-kit" size="lg">
            Arma tu kit
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Intro />
      <div className={styles.layout}>
        <form ref={formRef} className={styles.form} noValidate onSubmit={onSubmit} aria-describedby="checkout-nota">
          <p id="checkout-nota" className={styles.muted}>
            Todos los campos son obligatorios salvo los marcados como opcionales.
          </p>

          <fieldset className={styles.section}>
            <legend>
              <NumberedLabel n={1}>Contacto</NumberedLabel>
            </legend>
            <TextField name="name" label="Nombre completo" autoComplete="name" error={errors.name} onInput={clear("name")} />
            <TextField
              name="email"
              type="email"
              label="Correo"
              autoComplete="email"
              inputMode="email"
              hint="Aquí te llega la confirmación del pedido."
              error={errors.email}
              onInput={clear("email")}
            />
            <TextField
              name="phone"
              type="tel"
              label="Teléfono con WhatsApp"
              autoComplete="tel-national"
              inputMode="numeric"
              hint="10 dígitos. Lo usamos para coordinar la entrega."
              error={errors.phone}
              onInput={clear("phone")}
            />
          </fieldset>

          <fieldset className={styles.section}>
            <legend>
              <NumberedLabel n={2}>Envío</NumberedLabel>
            </legend>
            <TextField name="street" label="Calle y número" autoComplete="address-line1" error={errors.street} onInput={clear("street")} />
            <TextField name="neighborhood" label="Colonia" autoComplete="address-line2" error={errors.neighborhood} onInput={clear("neighborhood")} />
            <div className={styles.pair}>
              <TextField
                name="postalCode"
                label="Código postal"
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength={5}
                error={errors.postalCode}
                onInput={clear("postalCode")}
              />
              <TextField name="city" label="Ciudad o municipio" autoComplete="address-level2" error={errors.city} onInput={clear("city")} />
            </div>
            <SelectField name="state" label="Estado" autoComplete="address-level1" defaultValue="" error={errors.state} onChange={clear("state")}>
              <option value="" disabled>
                Elige tu estado
              </option>
              {MX_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>
            <TextField
              name="references"
              label="Referencias"
              optional
              hint="Entre qué calles, color de la fachada, a quién dejarlo."
              error={errors.references}
              onInput={clear("references")}
            />
            <TextField
              name="receiver"
              label="Quién recibe"
              optional
              autoComplete="off"
              hint="Si no eres tú: nombre de quien estará en el domicilio."
              error={errors.receiver}
              onInput={clear("receiver")}
            />
          </fieldset>

          <fieldset className={styles.section}>
            <legend>
              <NumberedLabel n={3}>Mayoría de edad</NumberedLabel>
            </legend>
            <TextField
              name="birthdate"
              type="date"
              label="Fecha de nacimiento"
              autoComplete="bday"
              max={todayInMexico()}
              hint={`Solo vendemos a mayores de ${MIN_AGE} años.`}
              error={errors.birthdate}
              onInput={clear("birthdate")}
            />
            <Checkbox name="adult" label={`Confirmo que tengo ${MIN_AGE} años o más.`} error={errors.adult} onChange={clear("adult")} />
          </fieldset>

          <fieldset className={styles.section}>
            <legend>
              <NumberedLabel n={4}>Últimos detalles</NumberedLabel>
            </legend>
            <Checkbox name="invoice" label="Necesito factura." hint="Te pediremos tus datos fiscales por correo después de la compra." />
            <Checkbox
              name="terms"
              label={
                <>
                  Acepto los <Link href="/terminos">términos y condiciones</Link> y el{" "}
                  <Link href="/privacidad">aviso de privacidad</Link>.
                </>
              }
              error={errors.terms}
              onChange={clear("terms")}
            />
            <Checkbox name="promos" label="Quiero recibir correos con nuevas etiquetas y promociones." />
          </fieldset>

          {result && (
            <div aria-live="polite">
              <Notice kind={result.kind}>{result.text}</Notice>
            </div>
          )}

          <Button type="submit" variant="secondary" size="lg" block loading={checking} disabled={!cartOk}>
            Revisar mis datos
          </Button>
        </form>

        <aside className={styles.summary} aria-labelledby="pedido-title">
          <h2 id="pedido-title" className={styles.summaryTitle}>
            Tu pedido
          </h2>
          {validation.status === "loading" || validation.status === "idle" ? (
            <p className={styles.muted} role="status">
              Revisando precios…
            </p>
          ) : validation.status === "error" ? (
            <Notice kind="error">{validation.error} Recarga la página para intentar de nuevo.</Notice>
          ) : (
            <ul className={styles.kits}>
              {validation.kits.map((k, i) => (
                <li key={k.id ?? i}>
                  {k.ok ? (
                    <>
                      <div className={styles.kitHead}>
                        <span>
                          Kit {i + 1} · {k.groupName}
                        </span>
                        <Price cents={k.totalCents} size="sm" unit="" />
                      </div>
                      <ul className={styles.lines}>
                        {k.lines.map((l) => (
                          <li key={l.slug}>
                            {l.quantity}× {l.name}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <Notice kind="error" title={`Kit ${i + 1}`}>
                      {k.message} <Link href="/carrito">Corrígelo en el carrito</Link>.
                    </Notice>
                  )}
                </li>
              ))}
            </ul>
          )}

          <dl className={styles.rows}>
            <div>
              <dt>Envío</dt>
              <dd className={styles.included}>Incluido</dd>
            </div>
          </dl>
          <div className={styles.total}>
            <span>Total</span>
            {ready ? <Price cents={validation.totalCents} size="lg" /> : <span className={styles.muted}>—</span>}
          </div>

          <div className={styles.pay}>
            <Button size="lg" block disabled aria-describedby="pagos-pronto">
              Pagos disponibles pronto
            </Button>
            <p id="pagos-pronto" className={styles.payNote}>
              <Icon name="info" size={16} /> Muy pronto podrás pagar aquí con Mercado Pago, de contado. Por ahora no se hace ningún cargo.
            </p>
          </div>
          <Link href="/carrito" className={styles.back}>
            Volver al carrito
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Intro() {
  return (
    <header className={styles.intro}>
      <NumberedLabel>Checkout</NumberedLabel>
      <Heading level={1} size="section">
        Ya casi.
      </Heading>
    </header>
  );
}
