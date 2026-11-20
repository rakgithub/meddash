import { describe, expect, it } from "vitest";
import { coughSyrupDetail, ibuprofenDetail, paracetamolDetail } from "../../../test/fixtures";
import { answerCompareQuestion } from "./mockCompare";

const pair = [ibuprofenDetail, paracetamolDetail];

describe("answerCompareQuestion", () => {
  it("names the product without a stomach warning and highlights the warnings", () => {
    const answer = answerCompareQuestion("Which is gentler on the stomach?", pair);

    expect(answer.row).toBe("warnings");
    expect(answer.text).toContain("Paracetamol 500mg is gentler on the stomach");
    expect(answer.text).toContain("Ibuprofen 400mg has a stomach warning");
  });

  it("says so when no product, or every product, has a stomach warning", () => {
    expect(answerCompareQuestion("gentle?", [paracetamolDetail, coughSyrupDetail]).text).toContain(
      "equally gentle",
    );
    expect(answerCompareQuestion("gentle?", [ibuprofenDetail]).text).toContain("All of them");
  });

  it("finds the cheapest per unit when the units match", () => {
    const answer = answerCompareQuestion("Which is cheapest?", pair);

    expect(answer.row).toBe("unitPrice");
    expect(answer.text).toContain("Paracetamol 500mg is cheapest");
  });

  it("falls back to the pack price when the units differ", () => {
    const answer = answerCompareQuestion("what does it cost", [
      paracetamolDetail,
      coughSyrupDetail,
    ]);

    expect(answer.row).toBe("price");
    expect(answer.text).toContain("Paracetamol 500mg costs least");
  });

  it("reports what is short on stock", () => {
    const answer = answerCompareQuestion("Is it in stock?", pair);

    expect(answer.row).toBe("stock");
    expect(answer.text).toContain("Paracetamol 500mg: Only 3 left");
    expect(answerCompareQuestion("stock", [ibuprofenDetail]).text).toBe(
      "All of them are in stock.",
    );
  });

  it.each([
    ["How big is the pack?", "packSize", "20 tablets"],
    ["What are the active ingredients?", "ingredients", "Ibuprofen 400 mg"],
    ["Which is easier to swallow?", "form", "Film-coated tablet"],
    ["Any warnings for pregnancy?", "warnings", "highlighted row"],
  ])("answers %j from the matching row", (question, row, text) => {
    const answer = answerCompareQuestion(question, pair);

    expect(answer.row).toBe(row);
    expect(answer.text).toContain(text);
  });

  it("says what it can compare when the question isn't understood", () => {
    const answer = answerCompareQuestion("What is the meaning of life?", pair);

    expect(answer.row).toBeNull();
    expect(answer.text).toContain("I can compare");
  });
});
