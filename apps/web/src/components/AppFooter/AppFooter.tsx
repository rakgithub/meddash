import { Link, useLocation } from "react-router-dom";
import { CATEGORIES, formatCategory } from "../../features/products";
import styles from "./AppFooter.module.css";

export function AppFooter() {
  const { pathname } = useLocation();
  // The assistant is a full-window chat; a footer under it would only push the composer around.
  if (pathname === "/assistant") return null;
  // On a phone the product page pins Add to cart to the bottom; leave room so it doesn't cover the footer.
  const roomForBuyBar = pathname.startsWith("/products/");

  return (
    <footer className={roomForBuyBar ? `${styles.footer} ${styles.buyBar}` : styles.footer}>
      {/* Someone who scrolled this far without finding a product is the person the assistant is for. */}
      <section className={styles.ask} aria-labelledby="footer-ask">
        <div className={styles.askText}>
          <h2 id="footer-ask">Not sure which medicine fits?</h2>
          <p>
            Describe how you feel. MedDash suggests what to try, and tells you when it&apos;s time
            to see a doctor.
          </p>
        </div>
        <Link className={styles.askButton} to="/assistant">
          Ask MedDash
        </Link>
        {/* The logo's capsule, blown up and cropped by the panel edge. */}
        <svg className={styles.askCapsule} viewBox="0 0 32 32" aria-hidden="true">
          <g transform="rotate(-45 16 16)">
            <path className={styles.capsuleRight} d="M16 10.5H23.5A5.5 5.5 0 0 1 23.5 21.5H16Z" />
            <path className={styles.capsuleLeft} d="M16 10.5H8.5A5.5 5.5 0 0 0 8.5 21.5H16Z" />
          </g>
        </svg>
      </section>

      <div className={styles.inner}>
        <div className={styles.about}>
          <p className={styles.brand}>
            <svg className={styles.mark} viewBox="0 0 32 32" aria-hidden="true">
              <g transform="rotate(-45 16 16)">
                <path
                  className={styles.capsuleRight}
                  d="M16 10.5H23.5A5.5 5.5 0 0 1 23.5 21.5H16Z"
                />
                <path className={styles.capsuleLeft} d="M16 10.5H8.5A5.5 5.5 0 0 0 8.5 21.5H16Z" />
              </g>
            </svg>
            MedDash
          </p>
          <p>Everyday medicines and care products from a pharmacy you can reach any time.</p>
          <ul className={styles.promises}>
            <li>Delivered in 1 to 3 working days</li>
            <li>Unopened packs can be returned within 14 days</li>
          </ul>
        </div>

        <nav className={styles.links} aria-label="Footer">
          <div>
            <h2>Shop</h2>
            <ul>
              <li>
                <Link to="/">All products</Link>
              </li>
              {CATEGORIES.map((slug) => (
                <li key={slug}>
                  <Link to={`/?category=${slug}`}>
                    <span className={styles.dot} data-category={slug} aria-hidden="true" />
                    {formatCategory(slug)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Your account</h2>
            <ul>
              <li>
                <Link to="/cart">Cart</Link>
              </li>
              <li>
                <Link to="/orders">Orders</Link>
              </li>
              <li>
                <Link to="/profile">Profile</Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className={styles.legal}>
        <p>
          Always read the label. If you are unsure whether a medicine is right for you, ask a
          pharmacist or doctor. In an emergency, call 112.
        </p>
        <p>© {new Date().getFullYear()} MedDash</p>
      </div>
    </footer>
  );
}
