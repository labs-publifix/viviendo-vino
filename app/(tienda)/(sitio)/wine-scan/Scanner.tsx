"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/app/_ui/Button";
import { TextField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import { compressPhoto } from "@/lib/wine-scan/image";
import type { ScanResponse } from "@/lib/wine-scan/types";
import { ScanResult } from "./ScanResult";
import styles from "./wineScan.module.css";

// Escáner móvil: botón grande que abre la cámara trasera (input con capture), compresión en el navegador,
// estados de carga y resultado. Alternativa: escribir el nombre del vino (mismo endpoint, con texto).

type Phase =
  | { name: "idle" }
  | { name: "working"; preview: string | null; mode: "foto" | "texto" }
  | { name: "result"; data: Extract<ScanResponse, { ok: true }>; preview: string | null }
  | { name: "retry"; message: string; kind: "pedir_otra_foto" | "no_es_vino" }
  | { name: "error"; message: string };

const SESSION_KEY = "vv_wine_scan_session";
const NETWORK_ERROR = "No hubo conexión con Wine Scan. Revisa tu internet e intenta de nuevo.";

/** Identificador anónimo del navegador, para agrupar escaneos sin saber quién es la persona. */
function sessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

const isMobile = () => window.matchMedia("(pointer: coarse)").matches;

export function Scanner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [stage, setStage] = useState(0);
  const [queryError, setQueryError] = useState<string>();
  const [manualOpen, setManualOpen] = useState(false);

  // Mensaje de avance: primero lee la etiqueta, después arma la guía.
  useEffect(() => {
    if (phase.name !== "working") return;
    const timer = window.setTimeout(() => setStage(1), 3500);
    return () => window.clearTimeout(timer);
  }, [phase.name]);

  useEffect(() => {
    if (phase.name === "result" || phase.name === "retry" || phase.name === "error") {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      resultRef.current?.focus({ preventScroll: true });
    }
  }, [phase.name]);

  async function send(body: FormData | string, preview: string | null) {
    setStage(0);
    setPhase({ name: "working", preview, mode: typeof body === "string" ? "texto" : "foto" });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const res = await fetch("/api/wine-scan", {
        method: "POST",
        body,
        headers: typeof body === "string" ? { "content-type": "application/json" } : undefined,
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => null)) as ScanResponse | null;
      if (!data) throw new Error(NETWORK_ERROR);
      if (!data.ok) return setPhase({ name: "error", message: data.error });
      const { accion, mensaje_usuario } = data.guia;
      if (accion !== "ok") {
        return setPhase({ name: "retry", kind: accion, message: mensaje_usuario ?? "No se alcanza a leer bien la etiqueta. ¿Puedes tomar otra foto?" });
      }
      setPhase({ name: "result", data, preview });
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setPhase({ name: "error", message: aborted ? "La lectura tardó demasiado. Intenta de nuevo con otra foto." : NETWORK_ERROR });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function openCamera() {
    // En escritorio no se sube nada: la vista de escritorio solo muestra el QR.
    if (!isMobile()) return;
    inputRef.current?.click();
  }

  async function onPhoto(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    let photo: Blob;
    try {
      photo = await compressPhoto(file);
    } catch {
      return setPhase({ name: "error", message: "No se pudo abrir esa foto. Intenta tomarla de nuevo." });
    }
    const form = new FormData();
    form.append("foto", photo, "etiqueta.jpg");
    form.append("session_id", sessionId());
    await send(form, URL.createObjectURL(photo));
  }

  async function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = String(new FormData(e.currentTarget).get("vino") ?? "").trim();
    if (query.length < 3) return setQueryError("Escribe el nombre del vino, por ejemplo: Barolo 2019.");
    setQueryError(undefined);
    await send(JSON.stringify({ texto: query, session_id: sessionId() }), null);
  }

  function reset() {
    if ((phase.name === "result" || phase.name === "working") && phase.preview) URL.revokeObjectURL(phase.preview);
    setPhase({ name: "idle" });
    setManualOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const busy = phase.name === "working";
  const manualForm = (
    <form className={styles.manual} onSubmit={onSearch} noValidate>
      <TextField name="vino" label="Nombre del vino" placeholder="Por ejemplo: Barolo 2019" autoComplete="off" enterKeyHint="search" maxLength={120} error={queryError} />
      <Button type="submit" variant="secondary" block disabled={busy}>
        <Icon name="search" size={18} /> Buscar la guía
      </Button>
    </form>
  );

  return (
    <div className={styles.scanner}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.fileInput}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onPhoto(e.target.files?.[0])}
      />

      {phase.name === "working" && (
        <div className={styles.working} role="status" aria-live="polite">
          <div className={styles.frame}>
            {phase.preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), se descarta
              <img src={phase.preview} alt="Tu foto de la etiqueta" />
            ) : (
              <Icon name="search" size={40} />
            )}
            <span className={styles.corners} aria-hidden="true" />
            <span className={styles.scanLine} aria-hidden="true" />
          </div>
          <p className={styles.stage}>
            {stage === 0 ? (phase.mode === "foto" ? "Leyendo la etiqueta" : "Buscando el vino") : "Armando tu guía"}
            <span className={styles.dots} aria-hidden="true" />
          </p>
        </div>
      )}

      {phase.name === "idle" && (
        <div className={styles.start}>
          <button type="button" className={styles.scanButton} onClick={openCamera}>
            <span className={styles.scanIcon} aria-hidden="true">
              <Icon name="camera" size={32} />
            </span>
            <span className={styles.scanLabel}>Escanear etiqueta</span>
            <span className={styles.scanHint}>Abre la cámara. Toma la etiqueta de frente y con luz.</span>
          </button>
          <ul className={styles.facts}>
            <li>Gratis y sin registro.</li>
            <li>La foto no se guarda: solo se usa para armar tu guía.</li>
            <li>Funciona con etiquetas en cualquier idioma.</li>
          </ul>
          <div className={styles.manualToggle}>
            <button type="button" className={styles.linkButton} aria-expanded={manualOpen} onClick={() => setManualOpen((o) => !o)}>
              ¿No tienes la botella a la mano? Escribe el nombre
            </button>
            {manualOpen && manualForm}
          </div>
        </div>
      )}

      <div ref={resultRef} tabIndex={-1} className={styles.anchor}>
        {phase.name === "retry" && (
          <div className={styles.retry}>
            <Notice kind="aviso" title={phase.kind === "no_es_vino" ? "No parece una etiqueta de vino" : "Hace falta otra foto"}>
              <p>{phase.message}</p>
              {phase.kind === "pedir_otra_foto" && <p>Prueba con la contraetiqueta: suele tener el nombre, la región y la uva.</p>}
            </Notice>
            <Button type="button" size="lg" block onClick={openCamera}>
              <Icon name="camera" size={20} /> Tomar otra foto
            </Button>
            <p className={styles.or}>o escribe el nombre del vino</p>
            {manualForm}
          </div>
        )}

        {phase.name === "error" && (
          <div className={styles.retry}>
            <Notice kind="error" title="No se pudo armar la guía">
              {phase.message}
            </Notice>
            <Button type="button" size="lg" block onClick={openCamera}>
              <Icon name="camera" size={20} /> Intentar de nuevo
            </Button>
            <p className={styles.or}>o escribe el nombre del vino</p>
            {manualForm}
          </div>
        )}

        {phase.name === "result" && <ScanResult
            data={phase.data}
            preview={phase.preview}
            onScanAgain={() => {
              reset();
              openCamera();
            }}
          />}
      </div>
    </div>
  );
}
