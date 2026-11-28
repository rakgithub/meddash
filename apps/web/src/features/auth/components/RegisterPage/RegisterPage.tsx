import { useActionState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../../../../lib/apiClient";
import { register } from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
import { PASSWORD_MIN } from "../../types";
import styles from "./RegisterPage.module.css";
import { PageTitle } from "../../../../lib/PageTitle";

interface RegisterResult {
  error: string | null;
  /** What was typed, put back after a failed attempt. The password is not kept. */
  name: string;
  email: string;
}

export function RegisterPage() {
  const { state, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  async function createAccount(_previous: RegisterResult, form: FormData): Promise<RegisterResult> {
    const name = String(form.get("name"));
    const email = String(form.get("email"));
    try {
      signIn(await register({ name, email, password: String(form.get("password")) }));
      navigate("/", { replace: true });
      return { error: null, name, email };
    } catch (err) {
      return {
        name,
        email,
        error:
          err instanceof ApiError && err.status === 409
            ? "An account with this email already exists. Log in instead."
            : err instanceof ApiError && err.status === 400
              ? "Check your name, email address and password, then try again."
              : "Couldn't create your account right now. Try again in a moment.",
      };
    }
  }

  const [result, action, submitting] = useActionState(createAccount, {
    error: null,
    name: "",
    email: "",
  });

  // While the form's own sign-up is running, it navigates home itself.
  if (state.status === "signed-in" && !submitting) return <Navigate to="/" replace />;

  return (
    <div className={styles.page}>
      <PageTitle title="Create an account" />
      <h1 className={styles.title}>Create an account</h1>
      <p className={styles.lead}>You need an account to order from MedDash.</p>
      {/* React resets the form after each submit; defaultValue keeps name and email after a failed one. */}
      <form className={styles.form} action={action}>
        <label className={styles.field}>
          Name
          <input
            name="name"
            autoComplete="name"
            required
            maxLength={100}
            defaultValue={result.name}
          />
        </label>
        <label className={styles.field}>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            defaultValue={result.email}
          />
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
        {result.error && (
          <p role="alert" className={styles.error}>
            {result.error}
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
