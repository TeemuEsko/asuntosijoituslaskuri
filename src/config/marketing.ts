const DEFAULT_KAJABI_TRAINING_URL =
  "https://www.teemuesko.fi/asuntosijoittajan-kasvuloikka-maksuton-koulutus";

export const kajabiTrainingUrl =
  process.env.NEXT_PUBLIC_KAJABI_TRAINING_URL?.trim() ||
  DEFAULT_KAJABI_TRAINING_URL;

