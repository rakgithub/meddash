import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PageTitle } from "./PageTitle";

describe("PageTitle", () => {
  beforeEach(() => {
    // The title index.html ships with.
    document.head.innerHTML = "<title>MedDash</title>";
  });

  it("puts the page title before the site name", () => {
    render(<PageTitle title="Your cart" />);
    expect(document.title).toBe("Your cart | MedDash");
  });

  it("follows the title when it changes", () => {
    const { rerender } = render(<PageTitle title="Product" />);
    rerender(<PageTitle title="Ibuprofen 400mg" />);
    expect(document.title).toBe("Ibuprofen 400mg | MedDash");
  });

  it("falls back to the site name when the page goes away", () => {
    const { unmount } = render(<PageTitle title="Your cart" />);
    unmount();
    expect(document.title).toBe("MedDash");
  });
});
