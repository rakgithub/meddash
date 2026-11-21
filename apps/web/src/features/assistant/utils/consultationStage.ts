import type { CaseFile, Message } from "../types";

export type ConsultationStage = "symptoms" | "questions" | "suggestions";

/** Where the consultation is: still describing, answering the follow-up questions, or looking at suggestions. */
export function consultationStage(messages: Message[], caseFile: CaseFile): ConsultationStage {
  const suggested = messages.some((m) =>
    m.parts.some((p) => p.kind === "products" && (p.items.length > 0 || (p.loading ?? 0) > 0)),
  );
  if (suggested) return "suggestions";
  if (caseFile.symptoms.length > 0) return "questions";
  return "symptoms";
}
