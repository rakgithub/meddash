import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { ProductDetail } from "../../../products";
import { answerCompareQuestion, type CompareAnswer } from "../../api/mockCompare";
import { compareProducts } from "../../utils/compareProducts";
import styles from "./CompareDrawer.module.css";

interface CompareDrawerProps {
  products: ProductDetail[];
  onClose: () => void;
}

/** Brings the row an answer is about into view; on a phone the table is taller than the sheet. */
function showRow(row: HTMLElement | null) {
  row?.scrollIntoView({ block: "nearest" });
}

const SUGGESTED_QUESTIONS = ["Which is gentler on the stomach?", "Which is cheapest?"];

/**
 * The shortlist side by side: a side drawer on wide screens, a bottom sheet on narrow ones. Questions
 * asked here are answered in the drawer, and the row an answer is about is highlighted.
 */
export function CompareDrawer({ products, onClose }: CompareDrawerProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<CompareAnswer | null>(null);

  // showModal makes the page inert, keeps Tab inside and closes on Escape (which fires "close").
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // The button that opened the drawer, so focus can go back to it afterwards.
    const opener = document.activeElement;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setAnswer(answerCompareQuestion(trimmed, products));
    setQuestion("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={styles.drawer}
      // Fires for Escape too, so the parent's state follows however the drawer was closed.
      onClose={onClose}
    >
      <div className={styles.body}>
        <header className={styles.header}>
          <h2 id={titleId}>Compare products</h2>
          <button
            ref={closeRef}
            className={styles.close}
            type="button"
            onClick={() => dialogRef.current?.close()}
          >
            Close
          </button>
        </header>

        {/* Current browsers make a scrollable region keyboard-focusable themselves. */}
        <div className={styles.scroll} role="region" aria-label="Comparison table">
          <table className={styles.table}>
            <caption className="visually-hidden">
              Side-by-side comparison of {products.map((p) => p.name).join(", ")}. Rows that differ
              are marked.
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">Feature</span>
                </th>
                {products.map((product) => (
                  <th key={product.id} scope="col">
                    <Link className={styles.name} to={`/products/${product.id}`}>
                      {product.name}
                    </Link>
                    <span className={styles.brand}>{product.brand}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareProducts(products).map((row) => {
                const asked = answer?.row === row.key;
                return (
                  <tr
                    key={row.key}
                    className={[row.differs && styles.differs, asked && styles.asked]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={asked || undefined}
                    ref={asked ? showRow : undefined}
                  >
                    <th scope="row">
                      {row.label}
                      {row.differs && <span className={styles.badge}>Differs</span>}
                    </th>
                    {row.values.map((value, i) => (
                      <td key={products[i]?.id}>{value}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.ask}>
          <p className={styles.answer} role="status">
            {answer?.text}
          </p>
          <ul className={styles.suggestions} aria-label="Suggested questions">
            {SUGGESTED_QUESTIONS.map((suggested) => (
              <li key={suggested}>
                <button className={styles.pill} type="button" onClick={() => ask(suggested)}>
                  {suggested}
                </button>
              </li>
            ))}
          </ul>
          <form className={styles.form} onSubmit={submit}>
            <label className="visually-hidden" htmlFor={`${titleId}-question`}>
              Ask about these products
            </label>
            <input
              id={`${titleId}-question`}
              className={styles.input}
              type="text"
              placeholder="Ask about these products"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button className={styles.send} type="submit">
              Ask
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
