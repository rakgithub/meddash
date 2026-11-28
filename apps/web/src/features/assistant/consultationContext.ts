import { createContext } from "react";
import type { useConsultation } from "./hooks/useConsultation";

export interface ConsultationContextValue extends ReturnType<typeof useConsultation> {
  /** The logo: a new conversation, opened with the intro again. */
  restart: () => void;
}

export const ConsultationContext = createContext<ConsultationContextValue | null>(null);
