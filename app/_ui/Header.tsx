"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart/store";
import { ButtonLink } from "./Button";
import { SocialLinks } from "./SocialLinks";
import { Icon } from "./Icon";
import styles from "./Header.module.css";

// Encabezado (Manual · 10.01): logo a la izquierda, navegación corta, "Arma tu kit" y carrito.

const NAV = [
  { href: "/vinos", label: "Vinos" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/envios", label: "Envíos" },
];

// "Descubrir": desplegable en escritorio, sección expandible en el menú móvil.
const DISCOVER = [
  { href: "/quiz", label: "Quiz IA" },
  { href: "/wine-scan", label: "Wine Scan" },
  { href: "/blog", label: "Blog" },
];

/** `cartCount` solo para la página de componentes; en la tienda se lee del carrito guardado. */
export function Header({ cartCount: forcedCount }: { cartCount?: number }) {
  const [open, setOpen] = useState(false);
  const [discover, setDiscover] = useState(false);
  const discoverRef = useRef<HTMLLIElement>(null);
  const discoverBtnRef = useRef<HTMLButtonElement>(null);
  const { kits } = useCart();
  const cartCount = forcedCount ?? kits.length;

  // Desplegable: se cierra con Escape (el foco vuelve al botón) o al hacer clic fuera.
  useEffect(() => {
    if (!discover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDiscover(false);
      discoverBtnRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!discoverRef.current?.contains(e.target as Node)) setDiscover(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [discover]);

  const closeAll = () => {
    setOpen(false);
    setDiscover(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} aria-label="Viviendo Vino, inicio">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG maestro del logotipo */}
          <img src="/brand/logo-color.svg" alt="" width={786} height={250} />
        </Link>

        <nav className={`${styles.nav} ${open ? styles.open : ""}`} id="menu-principal" aria-label="Principal">
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.navLink} onClick={closeAll}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li
              ref={discoverRef}
              className={styles.discover}
              onBlur={(e) => {
                // Al salir con Tab del desplegable, se cierra.
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDiscover(false);
              }}
            >
              <button
                ref={discoverBtnRef}
                type="button"
                className={`${styles.navLink} ${styles.discoverBtn}`}
                aria-expanded={discover}
                aria-controls="menu-descubrir"
                onClick={() => setDiscover((v) => !v)}
              >
                Descubrir <Icon name="chevron" size={14} />
              </button>
              <ul id="menu-descubrir" className={`${styles.dropdown} ${discover ? styles.dropdownOpen : ""}`}>
                {DISCOVER.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={styles.dropdownLink} onClick={closeAll}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <Link href="/nosotros" className={styles.navLink} onClick={closeAll}>
                Nosotros
              </Link>
            </li>
          </ul>
          {/* Solo en el menú desplegable del móvil. */}
          <div className={styles.navSocial}>
            <SocialLinks label="Síguenos" />
          </div>
        </nav>

        <div className={styles.actions}>
          <ButtonLink href="/arma-tu-kit" className={styles.cta}>
            Arma tu kit
          </ButtonLink>
          <Link href="/carrito" className={styles.cart} aria-label={`Carrito, ${cartCount} ${cartCount === 1 ? "kit" : "kits"}`}>
            <Icon name="cart" size={22} />
            {cartCount > 0 && <span className={styles.count}>{cartCount}</span>}
          </Link>
          <button
            type="button"
            className={styles.menuBtn}
            aria-expanded={open}
            aria-controls="menu-principal"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? "close" : "menu"} size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
