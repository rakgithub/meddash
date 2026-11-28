import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../../../../lib/apiClient";
import { login } from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
import styles from "./LoginPage.module.css";
import { PageTitle } from "../../../../lib/PageTitle";

/** Where to go after logging in: the page that sent the user here, or the home page. */
function returnPath(state: unknown): string {
  if (typeof state === "object" && state !== null && "from" in state) {
    const { from } = state;
    // Only in-app paths, so a crafted link cannot send the user to another site.
    if (typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) return from;
  }
  return "/";
}

export function LoginPage() {
  const { state, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const next = returnPath(location.state);

  if (state.status === "signed-in" && !submitting) return <Navigate to={next} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setSubmitting(true);
    try {
      const user = await login({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      signIn(user);
      navigate(next, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "That email and password don't match an account. Check them and try again."
          : "Couldn't log in right now. Try again in a moment.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageTitle title="Log in" />
      <h1 className={styles.title}>Log in</h1>
      <p className={styles.lead}>Log in to keep track of your orders and prescriptions.</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className={styles.field}>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className={styles.switch}>
        New to MedDash?{" "}
        <Link to="/register" state={location.state}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
