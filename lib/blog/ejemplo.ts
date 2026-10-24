// EJEMPLO · Datos estáticos de muestra para la portada mientras no existe el blog.
// No son artículos reales: se reemplazan cuando el blog tenga contenido (base de datos o CMS).

export type ArticuloResumen = {
  slug: string;
  categoria: string;
  titulo: string;
  minutos: number;
  imagen: { src: string; alt: string };
  ejemplo: true;
};

export const ARTICULOS_EJEMPLO: ArticuloResumen[] = [
  {
    slug: "ejemplo-leer-etiqueta",
    categoria: "Guía",
    titulo: "Cómo leer la etiqueta de un vino italiano",
    minutos: 4,
    imagen: { src: "/img/grupos/rojo.webp", alt: "Cuatro botellas de tinto italiano" },
    ejemplo: true,
  },
  {
    slug: "ejemplo-cenas-tinto",
    categoria: "Para la mesa",
    titulo: "Tres cenas fáciles para abrir un tinto",
    minutos: 5,
    imagen: { src: "/img/grupos/azul.webp", alt: "Un blanco, un rosado y dos tintos" },
    ejemplo: true,
  },
  {
    slug: "ejemplo-prosecco-rose",
    categoria: "Burbujas",
    titulo: "Prosecco o rosé: cuál abrir primero",
    minutos: 3,
    imagen: { src: "/img/grupos/amarillo.webp", alt: "Un Prosecco y un rosé espumoso" },
    ejemplo: true,
  },
];
