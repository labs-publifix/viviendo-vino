import Link from "next/link";

// Aviso de privacidad simplificado (anexo del Aviso de Privacidad autorizado, 5 nov 2026): va junto al correo en el
// checkout y en el Quiz. El texto es el del documento; solo se enlaza el aviso integral.
export const CASILLA_PROMOS = "Quiero recibir promociones, novedades y recomendaciones de viviendovino.com por correo electrónico.";

export function AvisoSimplificado({ className }: { className?: string }) {
  return (
    <p className={className}>
      Rafael Aguirre Palencia (viviendovino.com), con domicilio en Boca del Río, Veracruz, es responsable de tus datos personales. Los usaremos para
      procesar y entregar tu pedido o enviarte los resultados de tu quiz. Si nos autorizas marcando la casilla, también te enviaremos promociones y
      recomendaciones por correo. Compartimos tus datos con importadores aliados y paqueterías solo para entregar tus pedidos; no los vendemos.
      Consulta el <Link href="/privacidad">Aviso de Privacidad Integral</Link> en viviendovino.com, donde también puedes ejercer tus derechos ARCO.
    </p>
  );
}
