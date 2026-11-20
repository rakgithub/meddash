export type DosageFormKind = "tablet" | "liquid" | "spray" | "cream";

/** Groups a free-text dosage form ("Film-coated tablet", "Nasal spray") into the icon it gets. */
export function dosageFormKind(dosageForm: string | null): DosageFormKind | null {
  if (!dosageForm) return null;
  const form = dosageForm.toLowerCase();
  if (/spray/.test(form)) return "spray";
  if (/tablet|capsule|lozenge|pastille/.test(form)) return "tablet";
  if (/syrup|drops|solution|liquid|suspension/.test(form)) return "liquid";
  if (/cream|gel|lotion|ointment|balm/.test(form)) return "cream";
  return null;
}
