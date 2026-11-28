import type { LinkComponent } from "@meddash/design-system/components";
import { Link } from "react-router-dom";

/** The design system's `Button href` renders through this, so it navigates without a reload. */
export const RouterLink: LinkComponent = ({ href, className, children }) => (
  <Link to={href} className={className}>
    {children}
  </Link>
);
