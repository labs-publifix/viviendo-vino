import { ogCard, profileFromParams, profileParams } from "../../_imagen/card";

// GET /quiz/og/<perfil>: imagen de vista previa (1200×630) del enlace de resultado de cada perfil.
export const generateStaticParams = profileParams;

export async function GET(_request: Request, { params }: { params: Promise<{ perfil: string }> }) {
  return ogCard(await profileFromParams(params));
}
