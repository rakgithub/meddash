import { useContext } from "react";
import { ConsultationContext } from "../consultationContext";

/** The live conversation, shared by every page so it survives navigation. */
export function useConsultationContext() {
  const value = useContext(ConsultationContext);
  if (!value) throw new Error("useConsultationContext must be used inside <ConsultationProvider>");
  return value;
}
