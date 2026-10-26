// Íconos de trazo fino y uniforme, esquinas redondeadas (Manual · 7). Sin uvas, barricas ni corchos.
// Decorativos por defecto (aria-hidden); el texto vecino o el aria-label del botón da el significado.

const PATHS = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  check: "M5 12.5l4.5 4.5L19 7.5",
  arrow: "M5 12h14M13 6l6 6-6 6",
  menu: "M4 7h16M4 12h16M4 17h16",
  // Caja de 6
  box: "M3.5 8.5L12 4l8.5 4.5v8L12 21l-8.5-4.5v-8zM3.5 8.5L12 13l8.5-4.5M12 13v8",
  // Carrito de compras (encabezado y carrito vacío). La caja de arriba queda para "kit de 6".
  cart: "M3 4h2.4l2.1 11.1a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2L21 8H6.1M8.6 20.2a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 1 0-2.2 0M16.6 20.2a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 1 0-2.2 0",
  // Envío
  truck: "M3 6.5h11v9H3zM14 9.5h3.5l3 3v3h-6.5M6.5 18.5a1.5 1.5 0 1 0 0-.01M17 18.5a1.5 1.5 0 1 0 0-.01",
  // Copa
  glass: "M7.5 3.5h9c0 5-1.8 8-4.5 8.5-2.7-.5-4.5-3.5-4.5-8.5zM12 12v8M8.5 20.5h7",
  chat: "M4.5 19.5l1.2-3.6A7.5 7.5 0 1 1 8.6 18.6z",
  info: "M12 11v5M12 7.5v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  pause: "M9 6v12M15 6v12",
  play: "M8 5.5v13l10.5-6.5z",
  chevron: "M6 9.5l6 6 6-6",
  // Cámara (Wine Scan) y reloj (tiempo de lectura)
  camera: "M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
  clock: "M12 7.5V12l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  // Archivo (guía en PDF) y descarga
  file: "M7 3.5h6.5l4.5 4.5v12.5H7zM13.5 3.5V8H18",
  download: "M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14",
  // Wine Scan: compartir, buscar, repetir y opinión (me sirvió / no me sirvió).
  share: "M12 15V4M8 7.5L12 3.5l4 4M6.5 11H5.5v9.5h13V11h-1",
  search: "M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM15.5 15.5l5 5",
  refresh: "M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v4h-4",
  thumbUp: "M7.5 10.5v9.5H4.5v-9.5zM7.5 10.5l3.6-6.3a1.6 1.6 0 0 1 2.9 1.2l-.8 3.6h5.1a1.7 1.7 0 0 1 1.7 2l-1.4 6.9a1.7 1.7 0 0 1-1.7 1.4H7.5",
  thumbDown: "M7.5 13.5V4H4.5v9.5zM7.5 13.5l3.6 6.3a1.6 1.6 0 0 0 2.9-1.2l-.8-3.6h5.1a1.7 1.7 0 0 0 1.7-2l-1.4-6.9A1.7 1.7 0 0 0 16.9 4H7.5",
  // Redes sociales, en el mismo trazo fino que el resto del set.
  instagram: "M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 6.9v.01",
  facebook: "M15.5 3.5h-2A3.5 3.5 0 0 0 10 7v13.5M7 10.5h7.5",
  tiktok: "M13.5 3.5v11.75a3.25 3.25 0 1 1-3.25-3.25M13.5 3.5c.4 2.6 2.2 4.4 5 4.6",
  youtube: "M4.2 7.2c.2-1.5 1.3-2.5 2.8-2.6 1.6-.1 3.3-.1 5-.1s3.4 0 5 .1c1.5.1 2.6 1.1 2.8 2.6.2 1.6.2 3.2.2 4.8s0 3.2-.2 4.8c-.2 1.5-1.3 2.5-2.8 2.6-1.6.1-3.3.1-5 .1s-3.4 0-5-.1c-1.5-.1-2.6-1.1-2.8-2.6C4 15.2 4 13.6 4 12s0-3.2.2-4.8zM10.3 9.2v5.6l4.8-2.8z",
  // Panel de administración: secciones del menú lateral y controles del panel.
  home: "M4 10.5L12 4l8 6.5V20h-5.5v-5.5h-5V20H4z",
  orders: "M6 3.5h12v17l-3-2-3 2-3-2-3 2zM9 8.5h6M9 12h6M9 15.5h3",
  bottle: "M10 3.5h4M10.5 3.5v4.2c0 .8-.5 1.4-1.1 1.9A3.6 3.6 0 0 0 8 12.5v7.2c0 .5.4.8.8.8h6.4c.4 0 .8-.3.8-.8v-7.2a3.6 3.6 0 0 0-1.4-2.9c-.6-.5-1.1-1.1-1.1-1.9V3.5M8 14h8",
  wallet: "M4 7.5A2 2 0 0 1 6 5.5h11.5v3M4 7.5v10.5a2 2 0 0 0 2 2h14V8.5H6A2 2 0 0 1 4 7.5zM16.5 14.25v.01",
  megaphone: "M4 10v4h3l8 4.5v-13L7 10zM7 14l1.2 5.5h2.6L10 14.6M18.5 9.5a3.5 3.5 0 0 1 0 5",
  layers: "M12 4l8.5 4.5L12 13 3.5 8.5zM3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c.4-3.4 2.8-5.5 6-5.5s5.6 2.1 6 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c1.7.7 2.8 2.6 3 5.2",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.5-1.9-.8a7.4 7.4 0 0 1-2.3 1.3l-.3 2.1h-4l-.3-2.1a7.4 7.4 0 0 1-2.3-1.3l-1.9.8-2-3.5 1.6-1.2a7.6 7.6 0 0 1 0-3L2.9 9.3l2-3.5 1.9.8A7.4 7.4 0 0 1 9.1 5.3l.3-2.1h4l.3 2.1c.8.3 1.6.8 2.3 1.3l1.9-.8 2 3.5-1.6 1.2a7.6 7.6 0 0 1 0 3z",
  history: "M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.5H8M12 8v4.5l3 1.8",
  sidebar: "M4.5 4.5h15v15h-15zM9.5 4.5v15",
  logout: "M14 4.5h4.5v15H14M10 8l-4 4 4 4M6 12h9",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
