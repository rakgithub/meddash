import styles from "./PharmacistContact.module.css";

/** Static until there is a real hand-off; the number is a placeholder, not a live line. */
const PHONE = { display: "0800 000 0000", href: "tel:+498000000000" };

/** "Talk to a pharmacist" under every set of suggestions, opening a contact card. */
export function PharmacistContact() {
  return (
    <details className={styles.contact}>
      <summary className={styles.toggle}>Talk to a pharmacist</summary>
      <div className={styles.card}>
        <p className={styles.lead}>
          Not sure which one is right, or taking other medicines? Our pharmacists can help, free of
          charge.
        </p>
        <dl className={styles.details}>
          <dt>Phone</dt>
          <dd>
            <a href={PHONE.href}>{PHONE.display}</a>
          </dd>
          <dt>Hours</dt>
          <dd>Mon–Fri 8:00–20:00, Sat 9:00–14:00</dd>
        </dl>
      </div>
    </details>
  );
}
