"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/app/_ui/Button";
import { Checkbox, SelectField, TextField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import { Price } from "@/app/_ui/Price";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { borrarApartado, guardarApartado, leerApartado } from "@/lib/cart/apartado";
import { borrarCodigo, guardarCodigo, leerCodigo } from "@/lib/cart/codigo";
import { cart, useCart } from "@/lib/cart/store";
import { useCartValidation } from "@/lib/cart/useCartValidation";
import { MIN_AGE, todayInMexico } from "@/lib/checkout/age";
import { MX_STATES, checkoutSchema, fieldErrors, type CheckoutField, type FieldErrors } from "@/lib/checkout/schema";
import { APARTADO_MINUTOS, huellaCarrito, textoFaltante, type Faltante } from "@/lib/inventario/rules";
import { KIT_SIZE } from "@/lib/kit/rules";
import { formatMXN } from "@/lib/money";
import { useHydrated } from "@/lib/use-hydrated";
import { Apartado, type ApartadoVista } from "./Apartado";
import { CodigoDescuento, type CodigoAplicado } from "./CodigoDescuento";
import { PagoTarjeta, Reto3DS, type DatosBrick } from "./PagoTarjeta";
import styles from "./checkout.module.css";

// Checkout en dos pasos. 1) Datos de contacto, envío y mayoría de edad. 2) "Continuar al pago": el servidor revisa
// todo, aparta las botellas 30 minutos (/api/checkout/apartar) y aparece la cuenta regresiva junto al pago. Si el
// tiempo se acaba, el carrito sigue guardado y un botón confirma existencias y vuelve a apartar (hasta 3 veces).
// El pago es con tarjeta, dentro del sitio (Card Payment Brick de Mercado Pago), con el reto 3-D Secure del banco si
// lo pide y la pantalla de "pago en revisión". Sin credenciales de Mercado Pago, en dev queda el pago de prueba.
// Los datos personales no se guardan en el navegador: solo el id del apartado y su llave (lib/cart/apartado.ts).

type Result = { kind: "ok" | "error" | "info"; text: string; faltantes?: Faltante[] } | null;
type Paso = "datos" | "pago" | "listo" | "revision";
type RespuestaPago = { estado: "pagado"; folio: string } | { estado: "reto"; url: string } | { estado: "revision"; folio: string } | { estado: "rechazado" | "error"; mensaje: string };
type Datos = ReturnType<typeof readForm>;

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

export function Checkout({ pagoPrueba, mpPublicKey }: { pagoPrueba: boolean; mpPublicKey: string | null }) {
  const hydrated = useHydrated();
  const { kits } = useCart();
  const validation = useCartValidation(kits, hydrated);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<Result>(null);
  const [checking, setChecking] = useState(false);
  const [paso, setPaso] = useState<Paso>("datos");
  const [apartado, setApartado] = useState<ApartadoVista | null>(null);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [pagando, setPagando] = useState(false);
  const [folio, setFolio] = useState<string | null>(null);
  // Mercado Pago: total a pagar (del servidor), reto 3-D Secure en curso y cuántas veces se montó el formulario
  // (cada intento rechazado lo vuelve a montar: el token de la tarjeta es de un solo uso).
  const [totalPago, setTotalPago] = useState<number | null>(null);
  const [reto, setReto] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [fuePrueba, setFuePrueba] = useState(false);
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [vencido, setVencido] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const huella = huellaCarrito(kits);
  // Código de descuento: el campo solo existe si hay campañas activas; el descuento lo calcula el servidor.
  const [codigosActivos, setCodigosActivos] = useState(false);
  const [aplicado, setAplicado] = useState<CodigoAplicado | null>(null);
  const [codigoError, setCodigoError] = useState<string | null>(null);

  const ready = validation.status === "done";
  const cartOk = ready && validation.kits.length === kits.length && validation.kits.every((k) => k.ok) && validation.stockIssues.length === 0;

  const vista = (a: { expiraAt: string | null; renovaciones: number; maxRenovaciones: number; limite?: boolean }, serverNow: string): ApartadoVista => ({
    expiraAt: a.expiraAt,
    desfase: Date.parse(serverNow) - Date.now(),
    renovaciones: a.renovaciones,
    maxRenovaciones: a.maxRenovaciones,
    limite: Boolean(a.limite),
  });

  // Al volver al checkout con el mismo carrito: si sus botellas siguen apartadas, se ve cuánto tiempo queda.
  useEffect(() => {
    if (!hydrated || kits.length === 0) return;
    const guardado = leerApartado();
    if (!guardado || guardado.huella !== huella) return;
    let vivo = true;
    fetch("/api/checkout/apartado", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: guardado.id, token: guardado.token }) })
      .then((r) => r.json())
      .then((x) => {
        if (!vivo) return;
        if (x?.ok && x.estado === "pendiente_pago" && x.expiraAt && Date.parse(x.expiraAt) > Date.parse(x.serverNow)) {
          setApartado(vista(x, x.serverNow));
          // Con Mercado Pago: un pago que quedó en revisión (o ya se aprobó) se ve como tal al volver.
          if (mpPublicKey) void consultarPago(true);
        } else if (!x?.ok || x.estado !== "pendiente_pago") borrarApartado();
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir el checkout con este carrito
  }, [hydrated, huella]);

  const onVencio = useCallback(() => setVencido(true), []);

  function terminar(folioPedido: string, prueba: boolean) {
    borrarApartado();
    borrarCodigo();
    cart.clear();
    setFolio(folioPedido);
    setFuePrueba(prueba);
    setReto(null);
    setPaso("listo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Qué hacer con la respuesta de Mercado Pago (al pagar o al consultar). */
  function aplicarPago(r: RespuestaPago | null, silencioso = false) {
    if (!r) {
      if (!silencioso) setResult({ kind: "error", text: "No pudimos confirmar tu pago. No se hizo ningún cargo; intenta de nuevo." });
      return;
    }
    if (r.estado === "pagado") return terminar(r.folio, false);
    if (r.estado === "reto") {
      setReto(r.url);
      return;
    }
    if (r.estado === "revision") {
      setReto(null);
      setFolio(r.folio);
      setPaso("revision");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (silencioso) return;
    setReto(null);
    // El aviso va junto al formulario (que se vuelve a mostrar, vacío, para otro intento) y se lleva a la vista.
    setRechazo(r.mensaje);
    setIntento((n) => n + 1);
    // La copia visible (Next.js puede conservar copias ocultas de la página con el mismo id).
    requestAnimationFrame(() =>
      [...document.querySelectorAll<HTMLElement>("#pago-titulo")].find((el) => el.offsetParent !== null)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  async function pagarTarjeta(tarjeta: DatosBrick) {
    const guardado = leerApartado();
    if (!guardado) return;
    setResult(null);
    setRechazo(null);
    try {
      const res = await fetch("/api/checkout/pagar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: guardado.id, token: guardado.token, tarjeta }) });
      aplicarPago(await res.json().catch(() => null));
    } catch {
      aplicarPago(null);
    }
  }

  /** Consulta el pago (después del reto del banco). Reintenta unos segundos mientras el banco termina. */
  async function consultarPago(silencioso = false) {
    const guardado = leerApartado();
    if (!guardado) return;
    if (!silencioso) setConfirmando(true);
    try {
      await consultarVarias(guardado, silencioso);
    } finally {
      setConfirmando(false);
    }
  }

  async function consultarVarias(guardado: { id: string; token: string }, silencioso: boolean) {
    for (let i = 0; i < (silencioso ? 1 : 8); i++) {
      const r: RespuestaPago | null = await fetch("/api/checkout/pago-estado", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: guardado.id, token: guardado.token }) })
        .then((x) => x.json())
        .catch(() => null);
      if (r && r.estado !== "reto") {
        if (silencioso && r.estado !== "pagado" && r.estado !== "revision") return;
        return aplicarPago(r, silencioso);
      }
      if (silencioso) return;
      await new Promise((ok) => setTimeout(ok, 3000));
    }
    if (!silencioso) setResult({ kind: "info", text: "Tu banco todavía está confirmando el pago. Espera un momento; si ya terminaste, vuelve a tocar “Ya terminé con mi banco”." });
  }

  /** Pide al servidor la vista previa del código con este carrito. true si aplica. */
  async function probarCodigo(codigo: string): Promise<boolean> {
    try {
      const email = formRef.current ? String(new FormData(formRef.current).get("email") ?? "") : "";
      const guardado = leerApartado();
      const res = await fetch("/api/checkout/codigo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo, kits: kits.map((k) => ({ id: k.id, items: k.items })), email: email || undefined, previo: guardado ? { id: guardado.id, token: guardado.token } : undefined }),
      });
      const body = await res.json().catch(() => null);
      if (body?.ok) {
        setAplicado({ codigo: body.codigo, textoPublico: body.textoPublico, descuento: body.descuento });
        setCodigoError(null);
        guardarCodigo(body.codigo);
        return true;
      }
      setAplicado(null);
      setCodigoError(body?.error ?? "No pudimos revisar el código. Intenta de nuevo.");
      return false;
    } catch {
      setCodigoError("No pudimos revisar el código. Intenta de nuevo.");
      return false;
    }
  }

  function quitarCodigo() {
    setAplicado(null);
    setCodigoError(null);
    borrarCodigo();
  }

  // ¿Hay campañas? Si llegó con un enlace de campaña (?codigo=) o ya aplicó uno, se revisa con el carrito de hoy
  // (el descuento cambia con el carrito).
  const revisado = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || kits.length === 0 || revisado.current === huella) return;
    revisado.current = huella;
    let vivo = true;
    fetch("/api/checkout/codigo")
      .then((r) => r.json())
      .then(async (x) => {
        if (!vivo) return;
        setCodigosActivos(x?.activos === true);
        const pendiente = aplicado?.codigo ?? leerCodigo();
        if (x?.activos && pendiente && !(await probarCodigo(pendiente))) borrarCodigo();
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- al abrir el checkout y cuando cambia el carrito
  }, [hydrated, huella]);

  function focusFirst(errs: FieldErrors) {
    const first = ORDER.find((k) => errs[k]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  /** Revisa en el servidor y aparta (o conserva, o renueva) las botellas. */
  async function apartar(data: Datos) {
    setResult(null);
    setChecking(true);
    try {
      const guardado = leerApartado();
      const res = await fetch("/api/checkout/apartar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customer: data, kits: kits.map((k) => ({ id: k.id, items: k.items })), previo: guardado ? { id: guardado.id, token: guardado.token } : undefined, codigo: aplicado?.codigo ?? null }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) throw new Error(body?.error ?? "No pudimos revisar tus datos. Intenta de nuevo.");
      if (body.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
        setPaso("datos");
        setErrors(body.fieldErrors);
        focusFirst(body.fieldErrors);
        return;
      }
      if (!body.ok) {
        // Un código que dejó de aplicar (se agotó, ya lo usó…) se quita: puede seguir sin él.
        if (body.codigoError) {
          setAplicado(null);
          borrarCodigo();
          setCodigoError(body.cartError);
          setResult({ kind: "error", text: `${body.cartError} Quitamos el código; puedes continuar sin él.` });
          return;
        }
        setResult({ kind: "error", text: body.cartError ?? body.error ?? "Tu carrito necesita un cambio antes de pagar.", faltantes: body.faltantes });
        return;
      }
      const a = body.apartado;
      if (a.codigo) setAplicado((x) => ({ codigo: a.codigo, textoPublico: x?.textoPublico ?? "", descuento: a.descuento }));
      guardarApartado({ id: a.id, token: a.token ?? guardado?.token ?? "", huella });
      setApartado(vista(a, body.serverNow));
      setTotalPago(a.total);
      setVencido(false);
      setDatos(data);
      setPaso("pago");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setResult({ kind: "error", text: err instanceof Error ? err.message : "No pudimos revisar tus datos. Intenta de nuevo." });
    } finally {
      setChecking(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
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
    void apartar(data);
  }

  async function pagarPrueba() {
    const guardado = leerApartado();
    if (!guardado) return;
    setPagando(true);
    setResult(null);
    try {
      const res = await fetch("/api/checkout/pagar-prueba", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: guardado.id, token: guardado.token }) });
      const body = await res.json().catch(() => null);
      if (!body?.ok) {
        setResult({ kind: "error", text: body?.error ?? "No pudimos confirmar tu pago. Intenta de nuevo.", faltantes: body?.faltantes });
        return;
      }
      terminar(body.folio, true);
    } catch {
      setResult({ kind: "error", text: "No pudimos confirmar tu pago. Intenta de nuevo." });
    } finally {
      setPagando(false);
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

  if (paso === "listo" && folio) {
    return (
      <div className={styles.page}>
        <Intro />
        <div className={styles.listo} role="status">
          <h2>¡Gracias! Tu pedido está confirmado.</h2>
          <p>
            Tu número de pedido es <span className={styles.folio}>{folio}</span>. Te mandamos la confirmación por correo y otro cuando tu caja salga.
          </p>
          {fuePrueba && <Notice kind="info">Fue un pago de prueba: no se hizo ningún cargo.</Notice>}
          <ButtonLink href="/vinos" size="lg">
            Seguir viendo vinos
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (paso === "revision" && folio) {
    return (
      <div className={styles.page}>
        <Intro />
        <div className={styles.listo} role="status">
          <h2>Tu pago está en revisión.</h2>
          <p>
            Mercado Pago está revisando el pago de tu pedido <span className={styles.folio}>{folio}</span>. Suele tardar unos minutos y, a veces, hasta 48 horas.
          </p>
          <p>Tus botellas siguen apartadas. Te escribimos por correo en cuanto se confirme; no tienes que hacer nada más.</p>
          <ButtonLink href="/vinos" variant="secondary">
            Seguir viendo vinos
          </ButtonLink>
        </div>
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
        {paso === "pago" && datos && apartado && (
          <div className={styles.paso}>
            <Apartado apartado={apartado} renovando={checking} onRenovar={() => void apartar(datos)} onVencio={onVencio} />
            {result && <Resultado result={result} />}
            <section className={styles.datos} aria-labelledby="envio-titulo">
              <div className={styles.datosHead}>
                <h2 id="envio-titulo">Envío</h2>
                <button type="button" className={styles.linkBtn} onClick={() => setPaso("datos")}>
                  Cambiar datos
                </button>
              </div>
              <p>
                {datos.name} · {datos.phone}
              </p>
              <p>
                {datos.street}, {datos.neighborhood}, CP {datos.postalCode}, {datos.city}, {datos.state}
              </p>
            </section>
            <section className={styles.pago} aria-labelledby="pago-titulo">
              <h2 id="pago-titulo">Pago</h2>
              {rechazo && (
                <Notice kind="error" title="El pago no se completó. No se hizo ningún cargo.">
                  {rechazo} Tus botellas siguen apartadas: vuelve a capturar la tarjeta abajo.
                </Notice>
              )}
              {mpPublicKey ? (
                reto ? (
                  <>
                    {confirmando && (
                      <p className={styles.muted} role="status">
                        Confirmando tu pago con el banco…
                      </p>
                    )}
                    <Reto3DS url={reto} onTermino={() => void consultarPago()} />
                  </>
                ) : (
                  (!vencido || apartado.limite) && (
                    <PagoTarjeta
                      key={intento}
                      publicKey={mpPublicKey}
                      montoCentavos={totalPago ?? validation.totalCents - (aplicado?.descuento ?? 0)}
                      email={datos.email}
                      onPagar={pagarTarjeta}
                    />
                  )
                )
              ) : pagoPrueba ? (
                <>
                  <p className={styles.muted}>Aquí irá el formulario de tarjeta de Mercado Pago. En dev puedes simular un pago aprobado: no se hace ningún cargo.</p>
                  {(!vencido || apartado.limite) && (
                    <Button type="button" size="lg" block loading={pagando} onClick={pagarPrueba}>
                      Simular pago aprobado (prueba)
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button size="lg" block disabled aria-describedby="pagos-pronto">
                    Pago con tarjeta disponible pronto
                  </Button>
                  <p id="pagos-pronto" className={styles.payNote}>
                    <Icon name="info" size={16} /> Muy pronto podrás pagar aquí con tarjeta de crédito o débito. Por ahora no se hace ningún cargo.
                  </p>
                </>
              )}
            </section>
          </div>
        )}

        <form ref={formRef} className={styles.form} noValidate onSubmit={onSubmit} aria-describedby="checkout-nota" hidden={paso === "pago"}>
          {apartado && !vencido && <Apartado apartado={apartado} compacto onVencio={onVencio} />}
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

          {result && paso === "datos" && <Resultado result={result} />}

          <Button type="submit" size="lg" block loading={checking} disabled={!cartOk}>
            Continuar al pago
          </Button>
          <p className={styles.payNote}>
            <Icon name="clock" size={16} /> Al continuar te apartamos las botellas {APARTADO_MINUTOS} minutos mientras pagas.
          </p>
        </form>

        <aside className={styles.summary} aria-labelledby="pedido-title">
          <h2 id="pedido-title" className={styles.summaryTitle}>
            Tu pedido
          </h2>
          {validation.status === "loading" || validation.status === "idle" ? (
            <p className={styles.muted} role="status">
              Revisando precios y existencias…
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

          {(codigosActivos || aplicado) && ready && (
            <CodigoDescuento aplicado={aplicado} error={codigoError} editable={paso === "datos"} onAplicar={probarCodigo} onQuitar={quitarCodigo} />
          )}

          <dl className={styles.rows}>
            {aplicado && (
              <div>
                <dt>Descuento ({aplicado.codigo})</dt>
                <dd className={styles.descuento}>−{formatMXN(aplicado.descuento)}</dd>
              </div>
            )}
            <div>
              <dt>Envío</dt>
              <dd className={styles.included}>Incluido</dd>
            </div>
          </dl>
          <div className={styles.total}>
            <span>Total</span>
            {ready ? <Price cents={validation.totalCents - (aplicado?.descuento ?? 0)} size="lg" /> : <span className={styles.muted}>—</span>}
          </div>

          {ready && validation.stockIssues.length > 0 && (
            <Notice kind="aviso">
              Algunas botellas ya no alcanzan. <Link href="/carrito">Revísalo en el carrito</Link>.
            </Notice>
          )}
          <p className={styles.payNote}>
            <Icon name="info" size={16} /> Pago de contado con tarjeta de crédito o débito.
          </p>
          <Link href="/carrito" className={styles.back}>
            Volver al carrito
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Resultado({ result }: { result: NonNullable<Result> }) {
  return (
    <div aria-live="polite">
      <Notice kind={result.kind}>
        {result.text}
        {result.faltantes && result.faltantes.length > 0 && (
          <>
            {" "}
            {result.faltantes.map(textoFaltante).join(" ")} <Link href="/carrito">Corrígelo en el carrito</Link>.
          </>
        )}
      </Notice>
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
