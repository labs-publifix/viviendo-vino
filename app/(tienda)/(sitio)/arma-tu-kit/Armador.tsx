"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "@/app/_ui/Chip";
import { KitProgress } from "@/app/_ui/KitProgress";
import { Notice } from "@/app/_ui/Notice";
import { QuantityStepper } from "@/app/_ui/QuantityStepper";
import { Heading, MonoTag, NumberedLabel } from "@/app/_ui/Typography";
import { WineCard, type WineCardState } from "@/app/_ui/WineCard";
import { cart, useCart } from "@/lib/cart/store";
import type { GroupInfo, PresetKit } from "@/lib/catalog/repo";
import type { BottleGroup, Wine } from "@/lib/catalog/types";
import {
  KIT_SIZE,
  addBottle,
  bottleCount,
  canAdd,
  fullCaseOptions,
  kitGroup,
  kitTotalCents,
  quantityOf,
  removeBottle,
  type KitItem,
} from "@/lib/kit/rules";
import { formatMXN } from "@/lib/money";
import styles from "./armador.module.css";

// Armador de kits (Fundamentos C-03 a C-07): la primera botella fija el grupo, los demás vinos se atenúan
// con "No cabe en este kit", repetición libre y avance "n de 6". El servidor revalida al agregar al carrito.

type Message = { kind: "info" | "ok" | "aviso" | "error"; text: string } | null;
type Filter = BottleGroup | "todos";

export function Armador({ wines, groups, presets }: { wines: Wine[]; groups: GroupInfo[]; presets: PresetKit[] }) {
  const router = useRouter();
  const { draft, kits } = useCart();
  const [filter, setFilter] = useState<Filter>("todos");
  const [message, setMessage] = useState<Message>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bySlug = useMemo(() => new Map(wines.map((w) => [w.slug, w])), [wines]);
  const items = draft.items;
  const count = bottleCount(items);
  const group = kitGroup(items, bySlug) as BottleGroup | null;
  const total = kitTotalCents(items, bySlug);
  const editing = draft.editing && kits.some((k) => k.id === draft.editing) ? draft.editing : null;

  // Enlaces desde el catálogo, la ficha y la portada: ?vino=, ?kit=, ?grupo=, ?editar=. Se aplican una vez
  // y se limpian de la dirección para que recargar no repita la acción.
  // Lee la dirección y el carrito guardado (sistemas externos al render), por eso actualiza estado aquí.
  /* eslint-disable react-hooks/set-state-in-effect */
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    const params = new URLSearchParams(window.location.search);
    if ([...params.keys()].length === 0) return;
    window.history.replaceState(null, "", window.location.pathname);

    const editar = params.get("editar");
    const kit = params.get("kit");
    const vino = params.get("vino");
    const grupo = params.get("grupo");

    if (editar) {
      if (cart.editKit(editar)) setMessage({ kind: "info", text: "Estás editando un kit de tu carrito." });
      else setMessage({ kind: "aviso", text: "Ese kit ya no está en tu carrito." });
      return;
    }
    if (kit) {
      const preset = presets.find((p) => p.slug === kit);
      if (!preset) return setMessage({ kind: "aviso", text: "Ese kit ya no está disponible. Arma el tuyo." });
      const available = preset.items.every((i) => bySlug.get(i.slug)?.available);
      if (!available) return setMessage({ kind: "aviso", text: `Una botella de “${preset.name}” está agotada. Arma el tuyo con su grupo.` });
      const items = preset.items.map((i) => ({ slug: i.slug, quantity: i.quantity }));
      if (params.get("agregar") === "1") {
        // "Agregar este kit": va directo al carrito después de que el servidor lo revise.
        setFilter(preset.group);
        setMessage({ kind: "info", text: `Agregando “${preset.name}” a tu carrito…` });
        void addPresetToCart(preset.name, preset.slug, items);
        return;
      }
      const editingNow = cart.getState().draft.editing;
      cart.setDraft({ items: preset.items.map((i) => ({ slug: i.slug, quantity: i.quantity })), preset: preset.slug, ...(editingNow ? { editing: editingNow } : {}) });
      setFilter(preset.group);
      return setMessage({ kind: "ok", text: `Cargamos “${preset.name}”. Cambia las botellas que quieras.` });
    }
    if (vino) {
      const wine = bySlug.get(vino);
      if (!wine) return;
      setFilter(wine.group);
      const current = cart.getState().draft;
      const check = canAdd(current.items, vino, bySlug);
      if (check.ok) {
        cart.setDraft({ ...current, items: addBottle(current.items, vino, bySlug) });
        return setMessage({ kind: "ok", text: `Agregamos ${wine.name} a tu kit.` });
      }
      if (check.reason === "other-group") {
        return setError(`${wine.name} es del ${groupName(wine.group)} y tu kit es del ${groupName(kitGroup(current.items, bySlug))}. Vacía el kit para empezar con otro grupo.`);
      }
      if (check.reason === "full") return setMessage({ kind: "aviso", text: "Tu kit ya tiene 6 botellas. Quita una para agregar otra." });
      if (check.reason === "sold-out") return setMessage({ kind: "aviso", text: `${wine.name} está agotado por ahora.` });
      return;
    }
    if (grupo && groups.some((g) => g.code === grupo)) setFilter(grupo as BottleGroup);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al llegar a la página
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function addPresetToCart(name: string, slug: string, presetItems: KitItem[]) {
    try {
      const res = await fetch("/api/carrito/validar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kits: [{ items: presetItems }] }),
      });
      const data = await res.json().catch(() => null);
      const kit = data?.kits?.[0];
      if (!res.ok || !kit) throw new Error(data?.error ?? "No pudimos agregar el kit. Intenta de nuevo.");
      if (!kit.ok) {
        setMessage({ kind: "aviso", text: `${kit.message} Arma el tuyo con su grupo.` });
        return;
      }
      const saved = cart.addKit(presetItems, slug);
      if (!saved.ok) {
        setMessage({ kind: "aviso", text: "Tu carrito ya tiene 10 kits, el máximo por pedido." });
        return;
      }
      router.replace("/carrito?agregado=1");
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : `No pudimos agregar “${name}”. Intenta de nuevo.` });
    }
  }

  function groupName(code: string | null) {
    return (groups.find((g) => g.code === code)?.name ?? "otro grupo").toLowerCase();
  }

  function update(next: KitItem[], preset?: string) {
    setError(null);
    setMessage(null);
    cart.setDraft({ items: next, ...(editing ? { editing } : {}), ...(preset ? { preset } : {}) });
  }

  const add = (slug: string) => update(addBottle(items, slug, bySlug));
  const remove = (slug: string) => update(removeBottle(items, slug));

  function clear() {
    setError(null);
    setMessage(null);
    cart.clearDraft();
  }

  function cancelEdit() {
    cart.cancelEdit();
    setMessage(null);
    setError(null);
    router.push("/carrito");
  }

  async function addToCart() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/carrito/validar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kits: [{ items }] }),
      });
      const data = await res.json().catch(() => null);
      const kit = data?.kits?.[0];
      if (!res.ok || !kit) throw new Error(data?.error ?? "No pudimos revisar tu kit. Intenta de nuevo.");
      if (!kit.ok) {
        setError(kit.message);
        return;
      }
      const saved = cart.commitDraft();
      if (!saved.ok) {
        setError("Tu carrito ya tiene 10 kits, el máximo por pedido.");
        return;
      }
      router.push(editing ? "/carrito" : "/carrito?agregado=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos revisar tu kit. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function cardState(w: Wine): WineCardState {
    if (quantityOf(items, w.slug) > 0) return "in-kit";
    if (!w.available) return "sold-out";
    if (group && w.group !== group) return "incompatible";
    return "default";
  }

  const visibleGroups = groups.filter((g) => g.wineCount > 0 && (filter === "todos" || g.code === filter));
  const lines = items.map((i) => ({ ...i, wine: bySlug.get(i.slug) })).filter((l): l is KitItem & { wine: Wine } => Boolean(l.wine));

  const progressProps = {
    count,
    totalCents: total,
    group,
    error,
    loading: saving,
    completeLabel: editing ? "Guardar cambios" : "Agregar kit al carrito",
    onAddToCart: addToCart,
    onClear: clear,
  };

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <NumberedLabel>Armador</NumberedLabel>
        <Heading level={1} size="section">
          {editing ? "Edita tu kit." : "Arma tu kit."}
        </Heading>
        <p className={styles.lede}>
          Elige {KIT_SIZE} botellas del mismo grupo. Repite las que quieras. El envío ya va en el precio.
        </p>
        {editing && (
          <p className={styles.editing}>
            Editando un kit de tu carrito ·{" "}
            <button type="button" className={styles.textBtn} onClick={cancelEdit}>
              Cancelar y volver al carrito
            </button>
          </p>
        )}
      </header>

      <div className={styles.layout}>
        <div className={styles.catalog}>
          {message && (
            <div className={styles.message}>
              <Notice kind={message.kind}>{message.text}</Notice>
            </div>
          )}

          <div className={styles.filters} role="group" aria-label="Mostrar vinos del grupo">
            <Chip pressed={filter === "todos"} onClick={() => setFilter("todos")}>
              Todos
            </Chip>
            {groups
              .filter((g) => g.wineCount > 0)
              .map((g) => (
                <Chip key={g.code} pressed={filter === g.code} onClick={() => setFilter(g.code)}>
                  {g.name}
                </Chip>
              ))}
          </div>

          {visibleGroups.map((g) => {
            const list = wines.filter((w) => w.group === g.code);
            const otherGroup = Boolean(group && group !== g.code);
            return (
              <section key={g.code} className={styles.group} aria-labelledby={`grupo-${g.code}`}>
                <div className={styles.groupHead}>
                  <h2 id={`grupo-${g.code}`}>{g.name}</h2>
                  <MonoTag>
                    Kit de {formatMXN(g.kitMinCents)}
                    {g.kitMaxCents !== g.kitMinCents && ` a ${formatMXN(g.kitMaxCents)}`}
                  </MonoTag>
                  <p>{otherGroup ? `No cabe en tu kit del ${groupName(group)}. Vacía el kit para cambiar de grupo.` : g.description}</p>
                </div>

                {g.fullCaseOnly && (
                  <FullCase
                    group={g}
                    wines={list}
                    disabled={otherGroup}
                    current={items}
                    onPick={(next) => update(next)}
                  />
                )}

                <ul className={styles.grid}>
                  {list.map((w) => (
                    <li key={w.slug}>
                      <WineCard
                        wine={w}
                        state={cardState(w)}
                        quantity={quantityOf(items, w.slug)}
                        canAdd={count < KIT_SIZE}
                        href={`/vinos/${w.slug}`}
                        onAdd={() => add(w.slug)}
                        onIncrement={() => add(w.slug)}
                        onDecrement={() => remove(w.slug)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <aside className={styles.aside} aria-label="Tu kit">
          <KitProgress {...progressProps} />
          {lines.length > 0 && (
            <ul className={styles.lines} aria-label="Botellas en tu kit">
              {lines.map((l) => (
                <li key={l.slug}>
                  <div className={styles.lineText}>
                    <span className={styles.lineName}>{l.wine.name}</span>
                    <span className={styles.linePrice}>{formatMXN(l.wine.priceCents * l.quantity)}</span>
                  </div>
                  <QuantityStepper
                    value={l.quantity}
                    label={l.wine.name}
                    canIncrement={count < KIT_SIZE}
                    onIncrement={() => add(l.slug)}
                    onDecrement={() => remove(l.slug)}
                  />
                </li>
              ))}
            </ul>
          )}
          {kits.length > 0 && !editing && (
            <p className={styles.cartLink}>
              <Link href="/carrito">
                Tienes {kits.length} {kits.length === 1 ? "kit" : "kits"} en tu carrito
              </Link>
            </p>
          )}
        </aside>
      </div>

      <div className={styles.bar}>
        <KitProgress {...progressProps} variant="bar" />
      </div>
    </div>
  );
}

/** Grupo de caja completa (amarillo): combinaciones listas de 6. */
function FullCase({
  group,
  wines,
  disabled,
  current,
  onPick,
}: {
  group: GroupInfo;
  wines: Wine[];
  disabled: boolean;
  current: KitItem[];
  onPick: (items: KitItem[]) => void;
}) {
  const available = wines.filter((w) => w.available);
  const options = fullCaseOptions(available.map((w) => w.slug));
  const shortName = (slug: string) => available.find((w) => w.slug === slug)?.name.split(" ").slice(0, 2).join(" ") ?? slug;
  const same = (a: KitItem[]) =>
    a.length === current.length && a.every((i) => current.some((c) => c.slug === i.slug && c.quantity === i.quantity));
  if (options.length === 0) return null;

  return (
    <div className={styles.fullCase}>
      <p className={styles.fullCaseTitle}>Caja completa de {KIT_SIZE}</p>
      <div className={styles.fullCaseOptions} role="group" aria-label={`Cajas completas del ${group.name.toLowerCase()}`}>
        {options.map((opt) => {
          const label = opt.map((i) => `${i.quantity} ${shortName(i.slug)}`).join(" + ");
          return (
            <Chip key={label} pressed={same(opt)} disabled={disabled} onClick={() => onPick(opt)}>
              {label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
