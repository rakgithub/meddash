import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceHistogram } from "./PriceHistogram";

const spread = {
  min: 3,
  max: 11,
  buckets: [
    { from: 3, to: 5, count: 4 },
    { from: 5, to: 7, count: 0 },
    { from: 7, to: 9, count: 2 },
    { from: 9, to: 11, count: 1 },
  ],
};

const bars = (container: HTMLElement) => [...container.querySelectorAll("rect")];

describe("PriceHistogram", () => {
  it("says what the prices range from and to", () => {
    render(<PriceHistogram spread={spread} min="" max="" />);

    expect(screen.getByText(/3,00\s€ – 11,00\s€/)).toBeInTheDocument();
  });

  it("draws a bar per band, tallest for the most products", () => {
    const { container } = render(<PriceHistogram spread={spread} min="" max="" />);

    const heights = bars(container).map((r) => Number(r.getAttribute("height")));
    expect(heights).toHaveLength(4);
    expect(heights[0]).toBeGreaterThan(heights[2]);
    expect(heights[1]).toBeLessThan(heights[3]);
  });

  const lit = (container: HTMLElement) =>
    bars(container).map((r) => r.getAttribute("class")?.includes("inRange"));

  it("highlights every band that has products when no range is applied", () => {
    const { container } = render(<PriceHistogram spread={spread} min="" max="" />);

    // The second band is empty, so there is nothing to highlight.
    expect(lit(container)).toEqual([true, false, true, true]);
  });

  it("highlights only the bands with products inside the applied range", () => {
    const { container } = render(<PriceHistogram spread={spread} min="" max="5" />);

    expect(lit(container)).toEqual([true, false, false, false]);
  });

  it("copes with a single band", () => {
    const { container } = render(
      <PriceHistogram
        spread={{ min: 5, max: 5, buckets: [{ from: 5, to: 5, count: 3 }] }}
        min=""
        max=""
      />,
    );

    expect(bars(container)).toHaveLength(1);
  });
});
