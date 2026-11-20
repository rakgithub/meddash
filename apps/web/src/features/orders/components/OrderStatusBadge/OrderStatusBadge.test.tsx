import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderStatusBadge } from "./OrderStatusBadge";

describe("OrderStatusBadge", () => {
  it("shows the status as words", () => {
    render(<OrderStatusBadge status="pending_payment" />);
    expect(screen.getByText("Awaiting payment")).toBeVisible();
  });
});
