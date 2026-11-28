import { describe, expect, it } from "vitest";
import { ibuprofenDetail, order } from "../../../test/fixtures";
import type { Message } from "../types";
import { orderNote } from "./orderNote";

const suggestion: Message = {
  id: "a1",
  role: "assistant",
  status: "done",
  parts: [
    {
      kind: "products",
      items: [{ product: ibuprofenDetail, reason: "Eases pain", fit: "best" }],
    },
  ],
};

describe("orderNote", () => {
  it("names what was ordered and how to take what the chat suggested", () => {
    // The fixture order holds Ibuprofen (from the chat) and Vitamin D3 (picked in the shop).
    const note = orderNote(order, [suggestion], { "1": "a1" });

    expect(note.split("\n\n")).toEqual([
      "Order #7 is placed: Ibuprofen 400mg and Vitamin D3 1000 IU.",
      `Ibuprofen 400mg: ${ibuprofenDetail.usageInstructions}`,
      "Ask me anything about taking them.",
    ]);
  });

  it("only names the order when nothing in it came from the chat", () => {
    const one = { id: 8, items: [order.items[1]] };

    expect(orderNote(one, [suggestion], {})).toBe(
      "Order #8 is placed: Vitamin D3 1000 IU.\n\nAsk me anything about taking it.",
    );
  });

  it("skips a product whose suggestion is gone or has no instructions, and a deleted product", () => {
    const items = [
      { ...order.items[0] },
      { ...order.items[1], productId: null },
      { ...order.items[1], name: "Paracetamol 500mg", productId: "2" },
    ];
    const note = orderNote({ id: 9, items }, [suggestion], { "1": "gone", "2": "a1" });

    expect(note).toBe(
      "Order #9 is placed: Ibuprofen 400mg, Vitamin D3 1000 IU and Paracetamol 500mg.\n\nAsk me anything about taking them.",
    );
  });
});
