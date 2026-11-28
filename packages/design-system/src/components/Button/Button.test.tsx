import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LinkProvider, type LinkComponent } from "../LinkProvider/LinkProvider";
import { Button } from "./Button";

describe("Button", () => {
  it("runs onClick from a click and from the keyboard", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Place order</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Place order" }));
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("is a plain button by default, so it never submits a form by accident", () => {
    render(<Button>Add</Button>);
    expect(screen.getByRole("button", { name: "Add" })).toHaveAttribute("type", "button");
  });

  it("can submit a form when asked", async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    render(
      <form onSubmit={(e) => onSubmit(e.nativeEvent as SubmitEvent)}>
        <Button type="submit">Log in</Button>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("is disabled and marked busy while busy", async () => {
    const onClick = vi.fn();
    render(
      <Button busy onClick={onClick}>
        Placing order…
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Placing order…" });

    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not run onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Add
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add" })).not.toHaveAttribute("aria-busy");
  });

  it("renders a plain link for href without a LinkProvider", () => {
    render(<Button href="/shop">Browse products</Button>);
    expect(screen.getByRole("link", { name: "Browse products" })).toHaveAttribute("href", "/shop");
  });

  it("renders the app's link component for href", () => {
    const AppLink: LinkComponent = ({ href, className, children }) => (
      <a href={`/app${href}`} className={className} data-router="yes">
        {children}
      </a>
    );
    render(
      <LinkProvider component={AppLink}>
        <Button href="/cart">View cart</Button>
      </LinkProvider>,
    );
    expect(screen.getByRole("link", { name: "View cart" })).toHaveAttribute("href", "/app/cart");
  });
});
