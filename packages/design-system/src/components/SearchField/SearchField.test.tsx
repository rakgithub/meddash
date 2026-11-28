import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SearchField } from "./SearchField";

describe("SearchField", () => {
  it("is a labelled search box", async () => {
    render(<SearchField label="Search medicines" hint="Name or symptom" />);
    const box = screen.getByRole("searchbox", { name: "Search medicines" });

    await userEvent.type(box, "ibuprofen");

    expect(box).toHaveValue("ibuprofen");
    expect(box).toHaveAccessibleDescription("Name or symptom");
  });
});
