import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UploadPrescriptionButton } from "./UploadPrescriptionButton";

afterEach(() => vi.useRealTimers());

describe("UploadPrescriptionButton", () => {
  it("says upload is coming soon when clicked", async () => {
    render(<UploadPrescriptionButton />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    await userEvent.setup().click(screen.getByRole("button", { name: "Upload prescription" }));

    expect(screen.getByRole("status")).toHaveTextContent("Prescription upload is coming soon.");
  });

  it("hides the message again after a few seconds", async () => {
    // shouldAdvanceTime: testing-library's async helpers wait on a real setTimeout, which a
    // fully frozen fake clock would never fire.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<UploadPrescriptionButton />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.click(screen.getByRole("button", { name: "Upload prescription" }));
    expect(screen.getByRole("status")).toHaveTextContent("coming soon");

    await act(() => vi.advanceTimersByTimeAsync(4000));

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
