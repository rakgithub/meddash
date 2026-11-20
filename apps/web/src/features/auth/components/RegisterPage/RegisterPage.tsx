import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../../../../lib/apiClient";
import { register } from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
import { PASSWORD_MIN } from "../../types";
import styles from "./RegisterPage.module.css";

export function RegisterPage() {
  const { state, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (state.status === "signed-in" && !submitting) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setSubmitting(true);
    try {
      const user = await register({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      signIn(user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? "An account with this email already exists. Log in instead."
          : err instanceof ApiError && err.status === 400
            ? "Check your name, email address and password, then try again."
            : "Couldn't create your account right now. Try again in a moment.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Create an account</h1>
      <p className={styles.lead}>You need an account to order from MedDash.</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          Name
          <input name="name" autoComplete="name" required maxLength={100} />
        </label>
        <label className={styles.field}>
          Email
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <div className={styles.field}>
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN}
            maxLength={128}
            aria-describedby="register-password-hint"
          />
          <span id="register-password-hint" className={styles.hint}>
            At least {PASSWORD_MIN} characters
          </span>
        </div>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className={styles.switch}>
        Already have an account?{" "}
        <Link to="/login" state={location.state}>
          Log in
        </Link>
      </p>
    </div>
  );
}
