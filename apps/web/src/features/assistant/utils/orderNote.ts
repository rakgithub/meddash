import type { Order } from "../../orders";
import type { Message, Recommendation } from "../types";

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** The suggestion for `productId` in reply `messageId`, as it was shown. */
function suggestionFor(messages: Message[], messageId: string, productId: string) {
  const message = messages.find((m) => m.id === messageId);
  const items: Recommendation[] =
    message?.parts.flatMap((p) => (p.kind === "products" ? p.items : [])) ?? [];
  return items.find((item) => item.product.id === productId) ?? null;
}

/**
 * The assistant's note after an order placed during the conversation (decision 8): what was ordered,
 * and how to take what it suggested, from the product it showed. Written here, never by the model.
 */
export function orderNote(
  order: Pick<Order, "id" | "items">,
  messages: Message[],
  fromChat: Record<string, string>,
): string {
  const names = order.items.map((item) => item.name);
  const howToTake = order.items.flatMap((item) => {
    const messageId = item.productId === null ? undefined : fromChat[item.productId];
    if (item.productId === null || messageId === undefined) return [];
    const usage = suggestionFor(messages, messageId, item.productId)?.product.usageInstructions;
    return usage ? [`${item.name}: ${usage}`] : [];
  });
  const them = order.items.length === 1 ? "it" : "them";
  return [
    `Order #${order.id} is placed: ${listNames(names)}.`,
    ...howToTake,
    `Ask me anything about taking ${them}.`,
  ].join("\n\n");
}
