import { profileFromParams, profileParams, storyCard } from "../../_imagen/card";

// GET /quiz/tarjeta/<perfil>: tarjeta de 1080×1920 para Stories y WhatsApp.
export const generateStaticParams = profileParams;

export async function GET(_request: Request, { params }: { params: Promise<{ perfil: string }> }) {
  return storyCard(await profileFromParams(params));
}
