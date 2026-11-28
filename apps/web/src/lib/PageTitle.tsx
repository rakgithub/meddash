const SITE_NAME = "MedDash";

/**
 * The browser tab title for the current page. The app switches pages without a reload, so without
 * this every page keeps the title from index.html (WCAG 2.4.2). React hoists it into <head> and
 * removes it again when the page unmounts.
 */
export function PageTitle({ title }: { title: string }) {
  // One string child: React warns about a <title> with several children, e.g. {title} | {SITE_NAME}.
  return <title>{`${title} | ${SITE_NAME}`}</title>;
}
