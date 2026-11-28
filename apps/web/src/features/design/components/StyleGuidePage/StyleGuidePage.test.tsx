import { screen, within } from "@testing-library/react";
import { renderWithRouter as render } from "../../../../test/renderWithRouter";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StyleGuidePage } from "./StyleGuidePage";

describe("StyleGuidePage", () => {
  it("lists the sections read from the design-system CSS", () => {
    render(<StyleGuidePage />);

    expect(screen.getByRole("heading", { name: "Design tokens", level: 1 })).toBeInTheDocument();
    for (const name of [
      "Semantic colours",
      "Contrast",
      "Dark surfaces",
      "Type",
      "Motion",
      "Components",
    ]) {
      expect(screen.getByRole("heading", { name, level: 2 })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Space, on a 4px grid" })).toHaveAttribute(
      "href",
      "#space-on-a-4px-grid",
    );
  });

  it("shows each semantic colour in both themes", () => {
    render(<StyleGuidePage />);
    const row = within(screen.getByRole("rowheader", { name: "--color-accent" }).closest("tr")!);

    expect(row.getByText("mint-400")).toBeInTheDocument();
    expect(row.getByText("teal-700")).toBeInTheDocument();
  });

  it("works out the contrast of each pair in both themes", () => {
    render(<StyleGuidePage />);
    const row = within(
      screen.getByRole("rowheader", { name: "--color-text on --color-bg" }).closest("tr")!,
    );

    // fog-100 on ink-950 (dark) and slate-900 on mist-50 (light), as checked in the plan.
    expect(row.getByText(/^16\.3:1/)).toBeInTheDocument();
    expect(row.getByText(/^14\.7:1/)).toBeInTheDocument();
    expect(row.getAllByText("passes")).toHaveLength(2);
  });

  it("plays the motion samples and moves them back", async () => {
    const user = userEvent.setup();
    render(<StyleGuidePage />);

    await user.click(screen.getByRole("button", { name: "Play" }));
    await user.click(screen.getByRole("button", { name: "Move back" }));

    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });
});
