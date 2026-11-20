import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { initials } from "../../utils/initials";
import styles from "./ProfilePage.module.css";

/** Read-only account details. Render under <RequireAuth>. */
export function ProfilePage() {
  const { state } = useAuth();
  if (state.status !== "signed-in") return null;
  const { user } = state;

  return (
    <div className={styles.page}>
      <Link className={styles.back} to="/">
        ← Back to products
      </Link>
      <h1 className={styles.title}>Your profile</h1>
      <section className={styles.card} aria-label="Account details">
        <span className={styles.avatar} aria-hidden="true">
          {initials(user.name)}
        </span>
        <dl className={styles.details}>
          <div className={styles.row}>
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div className={styles.row}>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
