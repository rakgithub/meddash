import { useEffect, useRef, useState } from "react";
import { Button } from "@meddash/design-system/components";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth";
import { formatPrice, type ProductDetail } from "../../../products";
import { ApiError } from "../../../../lib/apiClient";
import { useCart } from "../../hooks/useCart";
import { MAX_QUANTITY_PER_PRODUCT } from "../../types";
import { QuantityStepper } from "../QuantityStepper/QuantityStepper";
import styles from "./AddToCart.module.css";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "added"; quantity: number }
  | { kind: "error"; message: string };

type Props = {
  product: Pick<ProductDetail, "id" | "name" | "price" | "stockQuantity" | "requiresPrescription">;
};

/** Why the product can't be added, or null when it can. */
function blockedReason(product: Props["product"]) {
  if (product.requiresPrescription) return "Needs a prescription";
  if (product.stockQuantity <= 0) return "Can't be ordered right now";
  return null;
}

/** Quantity, Add to cart and its outcome; on a phone, a bottom bar repeats the button once this scrolls away. */
export function AddToCart({ product }: Props) {
  const { state: auth } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [scrolledPast, setScrolledPast] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    // Without IntersectionObserver (old browsers, jsdom) the bar simply never shows.
    if (!root || typeof IntersectionObserver === "undefined") return;
    // Only once the controls have gone off the top: before they are reached, they are still ahead.
    const observer = new IntersectionObserver(([entry]) =>
      setScrolledPast(entry ? !entry.isIntersecting && entry.boundingClientRect.top < 0 : false),
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const reason = blockedReason(product);
  const max = Math.max(1, Math.min(MAX_QUANTITY_PER_PRODUCT, product.stockQuantity));
  const sending = status.kind === "sending";
  const disabled = reason !== null || sending || auth.status === "loading";

  const goToLogin = () =>
    navigate("/login", { state: { from: location.pathname + location.search } });

  async function handleAdd() {
    if (auth.status === "signed-out") {
      goToLogin();
      return;
    }
    setStatus({ kind: "sending" });
    try {
      await addItem(product.id, quantity);
      setStatus({ kind: "added", quantity });
    } catch (err) {
      // The session ran out since the page loaded: log in again and come back.
      if (err instanceof ApiError && err.status === 401) {
        goToLogin();
        return;
      }
      const message =
        err instanceof ApiError ? err.message : "Couldn't add to cart. Check your connection.";
      setStatus({ kind: "error", message });
    }
  }

  const buttonLabel = sending ? "Adding…" : "Add to cart";

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.row}>
        <QuantityStepper
          value={Math.min(quantity, max)}
          max={max}
          onChange={setQuantity}
          disabled={reason !== null || sending}
        />
        <div className={styles.addSlot}>
          <Button size="lg" block disabled={disabled} busy={sending} onClick={handleAdd}>
            {buttonLabel}
          </Button>
        </div>
      </div>
      {reason && <p className={styles.reason}>{reason}</p>}

      <div role="status" className={styles.outcome}>
        {status.kind === "added" && (
          <p className={styles.added}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 8.5l3 3 6-7" />
            </svg>
            Added {status.quantity} to cart.{" "}
            <Link className={styles.view} to="/cart">
              View cart
            </Link>
          </p>
        )}
      </div>
      {status.kind === "error" && (
        <p role="alert" className={styles.error}>
          {status.message}
        </p>
      )}

      {scrolledPast && reason === null && (
        <div className={styles.bar}>
          <div className={styles.barText}>
            <span className={styles.barName}>{product.name}</span>
            <span className={styles.barPrice}>{formatPrice(product.price)}</span>
          </div>
          <div className={styles.barAdd}>
            <Button size="lg" disabled={disabled} busy={sending} onClick={handleAdd}>
              {buttonLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
