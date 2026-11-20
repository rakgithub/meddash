import { describe, expect, it } from "vitest";
import { redFlagAlert } from "./redFlags";

describe("redFlagAlert", () => {
  it.each([
    ["I have chest pain when I walk", "chest pain"],
    ["Tight chest and a pain in my chest", "chest pain"],
    ["I can't breathe properly", "trouble breathing"],
    ["shortness of breath since this morning", "trouble breathing"],
    ["My dad's face is drooping and his speech is slurred", "signs of a stroke"],
    ["sudden weakness on one side", "signs of a stroke"],
    ["My baby has a high fever", "a fever in a baby"],
    ["3-month-old with a temperature of 39", "a fever in a baby"],
    ["There is blood in my vomit", "blood in vomit or stool"],
    ["my stool has blood in it", "blood in vomit or stool"],
    ["I keep having suicidal thoughts", "thoughts of suicide or self-harm"],
    ["I want to die", "thoughts of suicide or self-harm"],
  ])("raises an urgent alert for %j", (text, label) => {
    expect(redFlagAlert(text)).toMatchObject({
      kind: "alert",
      level: "urgent",
      title: `This needs a doctor now: you mentioned ${label}`,
    });
  });

  it("tells someone in crisis where to call", () => {
    expect(redFlagAlert("I want to kill myself")?.body).toContain("0800 111 0 111");
  });

  it.each(["Sore throat and fever", "Hay fever", "My child has a cough", "Upset stomach"])(
    "lets everyday symptoms through: %j",
    (text) => {
      expect(redFlagAlert(text)).toBeUndefined();
    },
  );
});
