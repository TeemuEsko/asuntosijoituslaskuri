const DEFAULT_KAJABI_TRAINING_URL =
  "https://www.teemuesko.fi/asuntosijoittajan-kasvuloikka-maksuton-koulutus";
const DEFAULT_PROFESSIONAL_EVALUATION_URL =
  "https://www.teemuesko.fi/offers/oQURChtb";

export const kajabiTrainingUrl =
  process.env.NEXT_PUBLIC_KAJABI_TRAINING_URL?.trim() ||
  DEFAULT_KAJABI_TRAINING_URL;

export const professionalEvaluationUrl =
  process.env.NEXT_PUBLIC_PROFESSIONAL_EVALUATION_URL?.trim() ||
  DEFAULT_PROFESSIONAL_EVALUATION_URL;

