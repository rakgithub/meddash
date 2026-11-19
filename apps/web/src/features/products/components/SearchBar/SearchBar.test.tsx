import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBar } from "./SearchBar";
import * as suggestApi from "../../api/fetchSuggestions";

vi.mock("../../api/fetchSuggestions");
const fetchSuggestions = vi.mocked(suggestApi.fetchSuggestions);

beforeEach(() => {
  vi.resetAllMocks();
  fetchSuggestions.mockResolvedValue([]);
});

function setup() {
  const onSearch = vi.fn();
  const onSelectCategory = vi.fn();
  render(<SearchBar onSearch={onSearch} onSelectCategory={onSelectCategory} />);
  return {
    onSearch,
    onSelectCategory,
    user: userEvent.setup(),
    input: screen.getByRole("combobox", { name: "Search products" }),
  };
}

describe("SearchBar", () => {
  it("is a search landmark", () => {
    setup();
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("searches the typed text on Enter", async () => {
    const { input, onSearch, user } = setup();

    await user.type(input, "vitamin{Enter}");

    expect(onSearch).toHaveBeenCalledWith("vitamin");
  });

  it("searches the typed text with the Search button", async () => {
    const { input, onSearch, user } = setup();

    await user.type(input, "cream");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith("cream");
  });

  it("searches a picked product by name", async () => {
    fetchSuggestions.mockResolvedValue([{ id: "11", name: "Ibuprofen Gel", brand: "Nurofen" }]);
    const { input, onSearch, user } = setup();

    await user.type(input, "ibu");
    await user.click(await screen.findByRole("option", { name: /Ibuprofen Gel/ }));

    expect(input).toHaveValue("Ibuprofen Gel");
    expect(onSearch).toHaveBeenCalledWith("Ibuprofen Gel");
  });

  it("applies a picked category and clears the box", async () => {
    const { input, onSearch, onSelectCategory, user } = setup();

    await user.type(input, "migraine");
    await user.click(await screen.findByRole("option", { name: /Pain relief/ }));

    expect(onSelectCategory).toHaveBeenCalledWith("pain-relief");
    expect(onSearch).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });

  it("shows the current search term and follows it when it changes", () => {
    const props = { onSearch: vi.fn(), onSelectCategory: vi.fn() };
    const { rerender } = render(<SearchBar {...props} query="ibu" />);
    const input = screen.getByRole("combobox", { name: "Search products" });
    expect(input).toHaveValue("ibu");

    rerender(<SearchBar {...props} query="vitamin" />);

    expect(input).toHaveValue("vitamin");
  });
});
