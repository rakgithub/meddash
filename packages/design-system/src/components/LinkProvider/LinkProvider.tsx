import { createContext, useContext, type ComponentType, type ReactNode } from "react";

/** What `Button` renders for `href`: the app's router link, adapted to take `href`. */
export type LinkComponent = ComponentType<{
  href: string;
  className: string;
  children: ReactNode;
}>;

const PlainLink: LinkComponent = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

// The package can't import the app's router, so the app hands its link component in once, at the root.
const LinkContext = createContext<LinkComponent>(PlainLink);

export function LinkProvider({
  component,
  children,
}: {
  component: LinkComponent;
  children: ReactNode;
}) {
  return <LinkContext.Provider value={component}>{children}</LinkContext.Provider>;
}

export const useLinkComponent = () => useContext(LinkContext);
