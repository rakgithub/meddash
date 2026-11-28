import { LinkProvider } from "@meddash/design-system/components";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { RouterLink } from "../lib/RouterLink";

/** Renders components that contain links or read the route. */
export function renderWithRouter(ui: ReactElement, route = "/") {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[route]}>
        <LinkProvider component={RouterLink}>{children}</LinkProvider>
      </MemoryRouter>
    ),
  });
}
