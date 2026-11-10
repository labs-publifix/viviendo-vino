// Páginas internas de Servicios: textos finales de los cuatro documentos Word (11 nov 2026), tal cual. No se publica la
// sección "Por confirmar antes de publicar" de cada documento (nota interna). Los textos admiten Markdown en línea
// (negritas y enlaces); los enlaces externos se abren en otra pestaña (lib/servicios/render.ts).
//
// Reglas de enlaces (en cualquier lugar del texto):
// - "Continental Media" → https://continentalmedia.com.mx
// - Publifix como plataforma de relaciones públicas (Publifix Suite) → https://launch.publifix.net
// - Publifix junto con agentes de IA → https://agents.publifix.net
// Las pruebas (tests/servicios.test.mjs) revisan que todas las menciones cumplan.

export const ENLACE = {
  continentalMedia: "https://continentalmedia.com.mx",
  publifixSuite: "https://launch.publifix.net",
  publifixAgentes: "https://agents.publifix.net",
  instagram: "https://www.instagram.com/viviendovino",
} as const;

const CM = `[Continental Media](${ENLACE.continentalMedia})`;

export type Tarjeta = { titulo: string; texto: string };
export type Grupo = { titulo?: string; texto?: string; tarjetas: Tarjeta[] };
export type Ejemplo = { titulo: string; texto: string; enlace: { texto: string; href: string } };

export type Seccion =
  | { tipo: "intro"; texto: string }
  | { tipo: "ejemplos"; titulo: string; texto: string; ejemplos: Ejemplo[] }
  | { tipo: "servicios"; titulo: string; texto?: string; grupos: Grupo[] }
  | { tipo: "pasos"; titulo: string; pasos: Tarjeta[] }
  /** Respaldo o trayectoria. Con `rafael`, lleva la foto de Rafael Aguirre. */
  | { tipo: "respaldo"; titulo: string; parrafos: string[]; rafael?: boolean };

export type Servicio = {
  slug: string;
  /** Nombre corto (pie, /servicios, formulario y correo). */
  nombre: string;
  /** Motivo del formulario de contacto (lib/contacto-form.ts). */
  motivo: "marketing" | "ia" | "consultoria" | "regalos";
  seo: { titulo: string; descripcion: string };
  hero: {
    titulo: string;
    subtitulo: string;
    principal: string;
    secundario: { texto: string; ancla: "contacto" | "ejemplos" };
    alt: string;
  };
  /** Mensaje con el que se abre WhatsApp. */
  whatsapp: string;
  secciones: Seccion[];
  cierre: { titulo: string; texto: string; principal: string; secundario: string };
};

const PASOS = "Cómo trabajamos";

export const SERVICIOS: Servicio[] = [
  {
    slug: "marketing-para-negocios-de-vino",
    nombre: "Marketing para negocios de vino",
    motivo: "marketing",
    seo: {
      titulo: "Marketing para negocios de vino · Viviendo Vino",
      descripcion: "Estrategia, contenido y medios en un solo equipo para bodegas, tiendas, restaurantes y marcas de vino: marketing digital, tradicional, relaciones públicas y producción.",
    },
    hero: {
      titulo: "Marketing para negocios de vino",
      subtitulo: "Estrategia, contenido y medios en un solo equipo, con 25 años de experiencia en gastronomía y hospitalidad.",
      principal: "Hablemos por WhatsApp",
      secundario: { texto: "Enviar mensaje", ancla: "contacto" },
      alt: "Botella de vino tinto sobre una mesa de madera en un estudio de fotografía, con una cámara en primer plano",
    },
    whatsapp: "Hola, vengo de viviendovino.com y me interesa el servicio de Marketing para negocios de vino.",
    secciones: [
      {
        tipo: "intro",
        texto:
          "Vender vino exige más que buenas etiquetas: hay que contar quién eres, estar donde está tu cliente y medir qué funciona. Diseñamos y ejecutamos el marketing completo de bodegas, tiendas, restaurantes y marcas de vino, con un solo objetivo de negocio detrás de cada canal.",
      },
      {
        tipo: "servicios",
        titulo: "Qué hacemos",
        texto: "El servicio se organiza en cuatro áreas. Cada una funciona por separado o junto con las demás.",
        grupos: [
          {
            titulo: "Marketing digital",
            texto: "Conectamos redes sociales, sitio web, publicidad y posicionamiento para que tu marca se vea coherente en todos lados y los resultados se puedan medir.",
            tarjetas: [
              {
                titulo: "Gestión de redes sociales",
                texto:
                  "Planeamos, creamos y publicamos contenido en Facebook, Instagram, LinkedIn, TikTok y YouTube. Incluye calendario editorial, tono y voz de marca, formatos verticales nativos de cada plataforma y reporte de métricas para mejorar mes a mes.",
              },
              {
                titulo: "Desarrollo web",
                texto:
                  "Sitios claros, rápidos y pensados para convertir visitas en clientes: desde una landing page hasta una tienda en línea completa con Stripe o Mercado Pago. Podemos sumar funciones con IA, como blog automatizado, quizzes interactivos y asistentes virtuales.",
              },
              {
                titulo: "Publicidad digital",
                texto:
                  "Campañas en Google, YouTube, Meta, Instagram y TikTok dirigidas a audiencias específicas. Optimizamos con las herramientas de IA de Meta (Andromeda) para llegar a más gente relevante con el mismo presupuesto.",
              },
              {
                titulo: "Posicionamiento SEO",
                texto: "Trabajamos tu sitio para que aparezca en Google y también en las búsquedas conversacionales de herramientas como ChatGPT, con más tráfico y mejores prospectos.",
              },
              {
                titulo: "Influencer marketing",
                texto: "Elegimos perfiles que de verdad compartan los valores y la audiencia de tu marca; negociamos, damos el brief, producimos con ellos y medimos resultados.",
              },
            ],
          },
          {
            titulo: "Marketing tradicional",
            texto: "Planeación de medios, investigación y construcción de marca para que cada decisión de comunicación se apoye en datos.",
            tarjetas: [
              {
                titulo: "Plan de medios",
                texto: "Analizamos audiencia, objetivo y presupuesto para elegir entre TV, radio, prensa, espectaculares y medios digitales, con proyecciones de alcance, frecuencia y resultados esperados.",
              },
              {
                titulo: "Investigación de mercados",
                texto: "Estudiamos datos y comportamiento de tu público para encontrar oportunidades reales, desde lanzar un producto hasta reposicionar una marca.",
              },
              {
                titulo: "Branding",
                texto: "Identidad, arquitectura de marca, naming, identidad visual y mensaje, para que tu marca se reconozca igual en todos los canales.",
              },
            ],
          },
          {
            titulo: "Relaciones públicas",
            texto: "Cuidamos la reputación de tu marca ante medios, públicos clave y la industria, desde la estrategia hasta la producción de cada evento.",
            tarjetas: [
              {
                titulo: "Estrategia de relaciones públicas",
                texto: `Acciones para fortalecer tu reputación y llevar tus mensajes prioritarios a medios, líderes de opinión e instituciones, tanto tradicionales como digitales. Trabajamos con [Publifix Suite](${ENLACE.publifixSuite}), nuestra plataforma aliada de gestión de relaciones públicas y monitoreo de medios.`,
              },
              {
                titulo: "Logística de eventos",
                texto: "Eventos corporativos, de lanzamiento y activaciones de marca: concepto, producción, logística, protocolo y cobertura de medios.",
              },
              {
                titulo: "Patrocinios",
                texto: "Buscamos y estructuramos patrocinios que fortalezcan tu posicionamiento y te acerquen a nuevas audiencias.",
              },
              {
                titulo: "Convocatoria de medios",
                texto: "Gestionamos la asistencia de prensa a eventos y ruedas de prensa, con materiales profesionales y presencia en la agenda mediática.",
              },
            ],
          },
          {
            titulo: "Producción",
            texto: "Cada pieza visual y audiovisual que tu marca necesita, con la misma calidad en todos los puntos de contacto.",
            tarjetas: [
              {
                titulo: "Diseño gráfico",
                texto: "Logotipos, sistemas de identidad, papelería y materiales publicitarios digitales e impresos, entregados listos para producción.",
              },
              {
                titulo: "Producción audiovisual",
                texto: "Reels, videos de marca, cápsulas de producto, storytelling y fotografía profesional.",
              },
              {
                titulo: "Animaciones con IA",
                texto:
                  "Motion graphics y piezas animadas con apoyo de IA generativa, con menos tiempo y costo de producción: infografías animadas, explainers y contenido para campañas.",
              },
              {
                titulo: "Impresos",
                texto: "Folletos, catálogos, cartas de vino y menú, señalética, banners, stands y material POP, siempre coherentes con tu identidad.",
              },
            ],
          },
        ],
      },
      {
        tipo: "pasos",
        titulo: PASOS,
        pasos: [
          { titulo: "Conversamos.", texto: "Entendemos tu negocio, tu cliente y lo que quieres lograr." },
          { titulo: "Proponemos.", texto: "Armamos un plan con los servicios que realmente necesitas, sus tiempos y cómo mediremos resultados." },
          { titulo: "Ejecutamos y medimos.", texto: "Producimos, publicamos y te entregamos reportes claros para ajustar sobre la marcha." },
        ],
      },
      {
        tipo: "respaldo",
        titulo: "Por qué Viviendo Vino",
        parrafos: [
          `Viviendo Vino es una plataforma de vino con audiencia nacional e internacional ([@viviendovino](${ENLACE.instagram})) y está respaldada por ${CM}, agencia de marketing, comunicación y relaciones públicas con 25 años de experiencia. Hablamos el idioma del vino y el de los resultados.`,
        ],
      },
    ],
    cierre: {
      titulo: "Cuéntanos de tu negocio",
      texto: "Platícanos qué vendes y a quién quieres llegar. Te respondemos con una propuesta a tu medida.",
      principal: "Hablemos por WhatsApp",
      secundario: "Enviar mensaje",
    },
  },
  {
    slug: "experiencias-con-ia",
    nombre: "Experiencias con IA",
    motivo: "ia",
    seo: {
      titulo: "Experiencias con IA para marcas de vino y restaurantes · Viviendo Vino",
      descripcion: "Agentes de IA, quizzes, blog automático, video y automatización para marcas de vino y restaurantes. Ya las hicimos para Viviendo Vino: Wine Scan, el Quiz y el blog.",
    },
    hero: {
      titulo: "Experiencias con IA para marcas de vino y restaurantes",
      subtitulo: "Herramientas que tus clientes usan de verdad: escanear una etiqueta, resolver un quiz, descargar una guía. Ya las hicimos para Viviendo Vino.",
      principal: "Hablemos por WhatsApp",
      secundario: { texto: "Ver ejemplos", ancla: "ejemplos" },
      alt: "Persona fotografiando con su celular una botella de vino tinto y una copa servida sobre una barra",
    },
    whatsapp: "Hola, vengo de viviendovino.com y me interesan las Experiencias con IA para mi marca.",
    secciones: [
      {
        tipo: "intro",
        texto:
          "La inteligencia artificial sirve cuando resuelve algo concreto para tu cliente y te da algo a cambio: su atención, sus datos o su compra. Diseñamos experiencias digitales con IA para que tu marca atienda mejor, recomiende mejor y venda más, sin que nadie tenga que aprender a usar nada nuevo.",
      },
      {
        tipo: "ejemplos",
        titulo: "Ejemplos reales en Viviendo Vino",
        texto: "Lo que ofrecemos lo usamos primero en casa. Estas tres experiencias están funcionando en este mismo sitio y sirven como muestra de lo que podemos construir para tu marca.",
        ejemplos: [
          {
            titulo: "Wine Scan",
            texto: "El cliente apunta la cámara de su celular a la etiqueta de cualquier vino y recibe una guía de maridaje e información útil en español, al instante.",
            enlace: { texto: "Probar Wine Scan", href: "/wine-scan" },
          },
          {
            titulo: "Quiz de IA",
            texto: "Unas preguntas sobre gustos y presupuesto y el sistema arma un kit de 6 botellas a la medida. Convierte la duda de qué comprar en una recomendación concreta.",
            enlace: { texto: "Hacer el quiz", href: "/quiz" },
          },
          {
            titulo: "Blog con guías descargables",
            texto: "Artículos publicados cada semana, con guías en PDF que el lector se lleva a cambio de su correo. Es contenido que atrae tráfico y construye una base de contactos.",
            enlace: { texto: "Ir al blog", href: "/blog" },
          },
        ],
      },
      {
        tipo: "servicios",
        titulo: "Qué podemos construir para ti",
        grupos: [
          {
            tarjetas: [
              {
                titulo: "Agentes de IA (WhatsApp, voz y chat)",
                texto:
                  "Asistentes que atienden, califican y dan seguimiento a prospectos desde WhatsApp, Messenger e Instagram, y agentes de voz que contestan llamadas y resuelven solicitudes básicas, las 24 horas, sin perder ninguna oportunidad.",
              },
              {
                titulo: "Blog automático con IA",
                texto: "Un flujo que genera, edita y publica artículos de forma constante, pensado para SEO y alineado con tu estrategia de contenido.",
              },
              {
                titulo: "Quizzes y experiencias interactivas",
                texto:
                  "Recomendadores de producto, tests de perfil de cliente y herramientas de autodiagnóstico. Hacen que el visitante se quede más tiempo y te dejan datos valiosos y prospectos calificados.",
              },
              {
                titulo: "Video y motion graphics con IA",
                texto:
                  "Videos explicativos, reels animados y piezas institucionales, además de motion graphics programados por código para animaciones precisas y reutilizables. Menos tiempo y menos costo de producción, con calidad profesional.",
              },
              {
                titulo: "Automatización de marketing y CRM",
                texto:
                  "Conectamos tus canales, tu CRM y tus herramientas de comunicación: secuencias de correo, notificaciones, actualización automática de bases de datos y reportes en tiempo real.",
              },
              {
                titulo: "Publicidad en la red de anunciantes de OpenAI",
                texto:
                  "Campañas dentro de una de las plataformas publicitarias más nuevas, donde las marcas llegan a personas que ya conversan con modelos de IA. Definimos segmentación y creatividades, hacemos la implementación y damos seguimiento al desempeño.",
              },
            ],
          },
        ],
      },
      {
        tipo: "pasos",
        titulo: PASOS,
        pasos: [
          { titulo: "Definimos el caso.", texto: "Elegimos juntos qué problema resolver primero y qué resultado esperas." },
          { titulo: "Construimos una primera versión.", texto: "La probamos con tus clientes reales y ajustamos." },
          { titulo: "Lanzamos y medimos.", texto: "Integramos la herramienta a tu sitio o canales y te mostramos qué tanto se usa y qué deja." },
        ],
      },
      {
        tipo: "respaldo",
        titulo: "Por qué Viviendo Vino",
        parrafos: [
          `Conocemos el vino y sabemos construir con IA. Wine Scan, el Quiz y el blog automatizado están hechos por nuestro equipo, con el respaldo de ${CM} y la plataforma de agentes de [Publifix](${ENLACE.publifixAgentes}).`,
        ],
      },
    ],
    cierre: {
      titulo: "¿Qué experiencia le gustaría vivir a tu cliente?",
      texto: "Cuéntanos tu negocio y te proponemos una primera herramienta con IA para empezar.",
      principal: "Hablemos por WhatsApp",
      secundario: "Enviar mensaje",
    },
  },
  {
    slug: "consultoria-para-centros-de-consumo",
    nombre: "Consultoría para centros de consumo",
    motivo: "consultoria",
    seo: {
      titulo: "Consultoría de vino para restaurantes, hoteles y bares · Viviendo Vino",
      descripcion: "Selección y diseño de la carta de vinos, maridajes con tu cocina y acompañamiento al equipo, de la mano de Rafael Aguirre, con más de 20 años en el mundo del vino.",
    },
    hero: {
      titulo: "Consultoría de vino para restaurantes, hoteles y bares",
      subtitulo: "Una carta de vinos pensada para tu cocina, tu clientela y tu negocio, de la mano de Rafael Aguirre, con más de 20 años en el mundo del vino.",
      principal: "Hablemos por WhatsApp",
      secundario: { texto: "Enviar mensaje", ancla: "contacto" },
      alt: "Dos copas de vino tinto sobre una mesa de restaurante junto a una carta, con una cava de botellas al fondo",
    },
    whatsapp: "Hola, vengo de viviendovino.com y me interesa la Consultoría de vino para mi restaurante, hotel o bar.",
    secciones: [
      {
        tipo: "intro",
        texto:
          "Una buena carta de vinos hace que el cliente pida mejor, gaste con gusto y regrese. Acompañamos a restaurantes, hoteles, bares y otros centros de consumo para elegir, ordenar y presentar sus vinos de acuerdo con su cocina, su público y sus números.",
      },
      {
        tipo: "servicios",
        titulo: "Qué hacemos",
        grupos: [
          {
            tarjetas: [
              {
                titulo: "Selección y diseño de la carta de vinos",
                texto:
                  "Elegimos las etiquetas que sí encajan con tu propuesta gastronómica y con quienes te visitan, y las ordenamos para que el cliente encuentre algo que le guste sin sentirse perdido.",
              },
              {
                titulo: "Maridajes con tu cocina",
                texto: "Relacionamos los vinos con los platillos de tu menú, para que el equipo pueda recomendar con seguridad y el cliente viva una comida completa.",
              },
              {
                titulo: "Presentación de la carta",
                texto: "Diseño de la carta impresa o digital, con la identidad de tu marca, a través de nuestra área de diseño y producción.",
              },
              {
                titulo: "Acompañamiento al equipo",
                texto: "Orientamos a meseros y encargados para que conozcan los vinos de la carta y los puedan recomendar con naturalidad.",
              },
            ],
          },
        ],
      },
      {
        tipo: "pasos",
        titulo: PASOS,
        pasos: [
          { titulo: "Conocemos tu establecimiento.", texto: "Revisamos tu cocina, tu clientela, tu ticket promedio y los vinos con los que ya cuentas." },
          { titulo: "Proponemos la carta.", texto: "Presentamos una selección y una estructura, con los maridajes y la lógica detrás de cada elección." },
          { titulo: "Implementamos y ajustamos.", texto: "Diseñamos la carta, preparamos al equipo y revisamos contigo cómo responden tus clientes." },
        ],
      },
      {
        tipo: "respaldo",
        titulo: "Quién está detrás: Rafael Aguirre Palencia",
        rafael: true,
        parrafos: [
          `Rafael es fundador de ${CM}, agencia de marketing, comunicación y relaciones públicas con 25 años de experiencia en estrategias de posicionamiento, sobre todo para el sector gastronómico y de hospitalidad. Ha desarrollado proyectos para restaurantes, hoteles y empresas del ramo, combinando visión de marketing con su interés por la gastronomía y las experiencias.`,
          "Su relación con el vino abarca más de 20 años como enófilo, comunicador y explorador de la cultura vinícola. Ha participado en numerosas catas y maridajes y ha hecho viajes de enoturismo a regiones productoras de México, Estados Unidos, Francia, España, Alemania y Portugal. Su experiencia incluye la selección y el diseño de cartas de vinos para restaurantes, uniendo el conocimiento del producto con las necesidades de cada establecimiento.",
          `Es fundador de [@viviendovino](${ENLACE.instagram}), plataforma con audiencia nacional e internacional desde la que comparte contenido educativo y recomendaciones para acercar el vino a personas con distintos niveles de conocimiento. Ha colaborado con bodegas, restaurantes y tiendas de vino, siempre desde una perspectiva cercana, informativa y enfocada en disfrutar y aprender.`,
        ],
      },
    ],
    cierre: {
      titulo: "Platiquemos de tu carta de vinos",
      texto: "Cuéntanos de tu restaurante, hotel o bar y te decimos por dónde empezar.",
      principal: "Hablemos por WhatsApp",
      secundario: "Enviar mensaje",
    },
  },
  {
    slug: "regalos-corporativos",
    nombre: "Regalos corporativos",
    motivo: "regalos",
    seo: {
      titulo: "Regalos corporativos con vino · Viviendo Vino",
      descripcion: "Kits de 6 botellas seleccionados por Rafael Aguirre para clientes, equipos y aliados: según tu presupuesto y tu destinatario, con vinos de distintas regiones y envío incluido.",
    },
    hero: {
      titulo: "Regalos corporativos con vino, elegidos por un conocedor",
      subtitulo: "Kits de vino seleccionados por Rafael Aguirre, con más de 20 años recorriendo bodegas y regiones vinícolas de México y del mundo.",
      principal: "Cotizar por WhatsApp",
      secundario: { texto: "Enviar mensaje", ancla: "contacto" },
      alt: "Caja de regalo abierta con seis botellas de vino tinto y un listón color vino sobre una mesa de madera",
    },
    whatsapp: "Hola, vengo de viviendovino.com y quiero cotizar Regalos corporativos con vino.",
    secciones: [
      {
        tipo: "intro",
        texto:
          "Un buen vino dice que te acuerdas de tu cliente, tu equipo o tu aliado, y lo dice con gusto. Armamos regalos corporativos con vino que se ven bien, se disfrutan y quedan bien con quien los recibe, sin que tengas que saber de etiquetas ni uvas.",
      },
      {
        tipo: "respaldo",
        titulo: "Por qué confiar en nuestra selección",
        rafael: true,
        parrafos: [
          "Rafael Aguirre Palencia lleva más de 20 años dentro de la cultura del vino. Ha participado en numerosas catas y maridajes, ha colaborado con bodegas, restaurantes y tiendas de vino, y ha viajado por regiones productoras de México, Estados Unidos, Francia, España, Alemania y Portugal. De ahí sale el criterio con el que se elige cada vino de nuestros kits: conocer el origen, la bodega y cómo se disfruta cada botella.",
          "Esa trayectoria nos permite recomendarte vinos de distintas regiones y estilos según a quién va dirigido el regalo, en lugar de ofrecerte siempre lo mismo.",
        ],
      },
      {
        tipo: "servicios",
        titulo: "Qué ofrecemos",
        grupos: [
          {
            tarjetas: [
              {
                titulo: "Kits de 6 botellas",
                texto:
                  'Nuestro formato principal: seis botellas seleccionadas, listas para regalar. Puedes elegir entre kits ya armados, como "Blancos frescos" o "Tintos de diario", o armar el tuyo con los vinos de nuestro catálogo.',
              },
              {
                titulo: "Selección según tu presupuesto y tu destinatario",
                texto: "Nos dices a quién le regalas y cuánto quieres invertir, y te recomendamos la combinación que mejor funciona.",
              },
              {
                titulo: "Vinos de distintas regiones",
                texto: "Tintos, blancos, rosados y espumosos, para que cada regalo tenga carácter y no se parezca al de otra empresa.",
              },
              { titulo: "Envío incluido", texto: "El precio de cada kit ya incluye el envío." },
            ],
          },
        ],
      },
      {
        tipo: "pasos",
        titulo: PASOS,
        pasos: [
          {
            titulo: "Nos cuentas la ocasión.",
            texto: "Fin de año, aniversario, cierre de proyecto, agradecimiento a clientes o reconocimiento al equipo, y a cuántas personas vas a regalar.",
          },
          { titulo: "Te proponemos la selección.", texto: "Te mostramos las opciones de kit y su precio para que elijas." },
          { titulo: "Te lo entregamos.", texto: "Coordinamos el pedido y el envío para que llegue a tiempo." },
        ],
      },
      {
        tipo: "respaldo",
        titulo: "Respaldo",
        parrafos: [
          `Viviendo Vino es la plataforma de Rafael Aguirre, con audiencia nacional e internacional en [@viviendovino](${ENLACE.instagram}), y cuenta con el respaldo de ${CM}, agencia con 25 años de experiencia en marketing, comunicación y relaciones públicas para el sector gastronómico y de hospitalidad.`,
        ],
      },
    ],
    cierre: {
      titulo: "¿A quién quieres sorprender?",
      texto: "Dinos para quién es el regalo y cuántos necesitas. Te respondemos con una propuesta.",
      principal: "Cotizar por WhatsApp",
      secundario: "Enviar mensaje",
    },
  },
];

export const servicioPorSlug = (slug: string) => SERVICIOS.find((s) => s.slug === slug) ?? null;
export const rutaServicio = (slug: string) => `/servicios/${slug}`;
