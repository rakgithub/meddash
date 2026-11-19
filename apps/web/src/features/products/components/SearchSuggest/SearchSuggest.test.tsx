import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchSuggest } from "./SearchSuggest";
import * as api from "../../api/fetchSuggestions";
import type { Suggestion } from "../../types";

vi.mock("../../api/fetchSuggestions");
const fetchSuggestions = vi.mocked(api.fetchSuggestions);

const tablets: Suggestion = { id: "1", name: "Ibuprofen 400mg", brand: "Nurofen" };
const gel: Suggestion = { id: "11", name: "Ibuprofen Gel", brand: "Nurofen" };

function setup() {
  const onSelect = vi.fn();
  function Harness() {
    const [value, setValue] = useState("");
    return (
      <>
        <label htmlFor="name">Name</label>
        <SearchSuggest id="name" value={value} onChange={setValue} onSelect={onSelect} />
      </>
    );
  }
  render(<Harness />);
  return {
    onSelect,
    user: userEvent.setup(),
    input: screen.getByRole("combobox", { name: "Name" }),
  };
}

const option = (name: RegExp) => screen.getByRole("option", { name });

beforeEach(() => {
  vi.resetAllMocks();
  fetchSuggestions.mockResolvedValue([tablets, gel]);
});

describe("SearchSuggest", () => {
  it("is a collapsed combobox wired to its listbox", () => {
    const { input } = setup();

    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input.getAttribute("aria-controls")).toBe(
      screen.getByRole("listbox", { hidden: true }).id,
    );
  });

  it("shows suggestions after typing and announces how many there are", async () => {
    const { input, user } = setup();

    await user.type(input, "ibu");

    const listbox = await screen.findByRole("listbox", { name: "Suggestions" });
    expect(within(listbox).getAllByRole("option")).toHaveLength(2);
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("status")).toHaveTextContent("2 suggestions available");
    expect(fetchSuggestions).toHaveBeenLastCalledWith("ibu", expect.any(AbortSignal));
  });

  it("moves the active option with the arrow keys, wrapping at both ends", async () => {
    const { input, user } = setup();
    await user.type(input, "ibu");
    await screen.findByRole("listbox");

    await user.keyboard("{ArrowDown}");
    expect(option(/400mg/)).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", option(/400mg/).id);

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", option(/Gel/).id);
    expect(option(/400mg/)).toHaveAttribute("aria-selected", "false");

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", option(/400mg/).id);

    await user.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", option(/Gel/).id);
  });

  it("starts from the last option when pressing ArrowUp first", async () => {
    const { input, user } = setup();
    await user.type(input, "ibu");
    await screen.findByRole("listbox");

    await user.keyboard("{ArrowUp}");

    expect(input).toHaveAttribute("aria-activedescendant", option(/Gel/).id);
  });

  it("selects the active option with Enter and closes the list", async () => {
    const { input, onSelect, user } = setup();
    await user.type(input, "ibu");
    await screen.findByRole("listbox");

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledWith(gel);
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });

  it("does not select anything on Enter when no option is active", async () => {
    const { input, onSelect, user } = setup();
    await user.type(input, "ibu");
    await screen.findByRole("listbox");

    await user.keyboard("{Enter}");

    expect(onSelect).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape but keeps the typed text, and reopens on ArrowDown", async () => {
    const { input, user } = setup();
    await user.type(input, "ibu");
    await screen.findByRole("listbox");

    await user.keyboard("{ArrowDown}{Escape}");

    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).not.toHaveAttribute("aria-activedescendant");
    expect(input).toHaveValue("ibu");

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", option(/400mg/).id);
  });

  it("selects an option on click without losing focus", async () => {
    const { input, onSelect, user } = setup();
    await user.type(input, "ibu");

    await user.click(await screen.findByRole("option", { name: /Gel/ }));

    expect(onSelect).toHaveBeenCalledWith(gel);
    expect(input).toHaveFocus();
  });

  it("closes when focus leaves the input", async () => {
    const { input, user } = setup();
    await user.type(input, "ibu");
    await screen.findByRole("listbox");

    await user.tab();

    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("bolds the typed prefix and shows the brand", async () => {
    const { input, user } = setup();
    await user.type(input, "ibu");

    const first = await screen.findByRole("option", { name: /400mg/ });
    expect(within(first).getByText("Ibu").tagName).toBe("STRONG");
    expect(first).toHaveTextContent("Nurofen");
  });

  it("tells the user when nothing matches", async () => {
    fetchSuggestions.mockResolvedValue([]);
    const { input, user } = setup();

    await user.type(input, "zzz");

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("No matching products"),
    );
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("tells the user when suggestions fail to load", async () => {
    fetchSuggestions.mockRejectedValue(new Error("boom"));
    const { input, user } = setup();

    await user.type(input, "ibu");

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Suggestions unavailable"),
    );
  });

  it("does not fetch for a single character", async () => {
    const { input, user } = setup();

    await user.type(input, "i");
    await user.keyboard("{ArrowDown}");

    expect(fetchSuggestions).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });
});
