export interface BodyRegion {
  id: "head" | "eyes" | "throat" | "chest" | "stomach" | "skin" | "joints" | "mind";
  label: string;
  /**
   * The common symptoms offered once the region is chosen, without a model call. "Chest pain" is there on
   * purpose: it is a red flag.
   */
  symptoms: string[];
}

export const BODY_REGIONS: BodyRegion[] = [
  { id: "head", label: "Head", symptoms: ["Headache", "Fever"] },
  { id: "eyes", label: "Eyes", symptoms: ["Itchy eyes", "Hay fever"] },
  {
    id: "throat",
    label: "Nose and throat",
    symptoms: ["Sore throat", "Blocked nose", "Sneezing", "Cough"],
  },
  { id: "chest", label: "Chest", symptoms: ["Cough", "Heartburn", "Chest pain"] },
  {
    id: "stomach",
    label: "Stomach",
    symptoms: ["Upset stomach", "Nausea", "Diarrhoea", "Heartburn"],
  },
  { id: "skin", label: "Skin", symptoms: ["Dry skin", "Itchy skin", "Rash"] },
  { id: "joints", label: "Joints", symptoms: ["Joint pain", "Muscle pain"] },
  { id: "mind", label: "Sleep and mind", symptoms: ["Trouble sleeping", "Feeling stressed"] },
];

/** The first message a chosen region sends, e.g. "My nose and throat". */
export function regionMessage(region: BodyRegion): string {
  return `My ${region.label.toLowerCase()}`;
}

/** The region a message was sent for. Only the exact message counts, so typed text is never read as one. */
export function regionFromMessage(text: string): BodyRegion | undefined {
  const normalised = text.trim().toLowerCase();
  return BODY_REGIONS.find((region) => regionMessage(region).toLowerCase() === normalised);
}
