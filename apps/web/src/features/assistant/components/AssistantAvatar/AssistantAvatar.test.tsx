import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssistantAvatar } from "./AssistantAvatar";

describe("AssistantAvatar", () => {
  it("is decorative, so screen readers skip it", () => {
    const { container } = render(<AssistantAvatar />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});
