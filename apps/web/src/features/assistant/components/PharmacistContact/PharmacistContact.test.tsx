import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PharmacistContact } from "./PharmacistContact";

describe("PharmacistContact", () => {
  it("opens a contact card with a phone link and opening hours", async () => {
    render(<PharmacistContact />);
    const phone = () => screen.queryByRole("link", { name: "0800 000 0000" });
    expect(phone()).not.toBeVisible();

    await userEvent.click(screen.getByText("Talk to a pharmacist"));

    expect(phone()).toBeVisible();
    expect(phone()).toHaveAttribute("href", "tel:+498000000000");
    expect(screen.getByText("Mon–Fri 8:00–20:00, Sat 9:00–14:00")).toBeVisible();
  });
});
