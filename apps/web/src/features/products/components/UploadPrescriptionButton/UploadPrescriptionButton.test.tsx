import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { UploadPrescriptionButton } from "./UploadPrescriptionButton";

describe("UploadPrescriptionButton", () => {
  it("says upload is coming soon when clicked", async () => {
    render(<UploadPrescriptionButton />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    await userEvent.setup().click(screen.getByRole("button", { name: "Upload prescription" }));

    expect(screen.getByRole("status")).toHaveTextContent("Prescription upload is coming soon.");
  });
});
