import { useActionState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../../../../lib/apiClient";
import { login } from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
import styles from "./LoginPage.module.css";
import { PageTitle } from "../../../../lib/PageTitle";

// Only in-app paths, so a crafted link cannot send the user to another site.
const isAppPath = (path: unknown): path is string =>
  typeof path === "string" && /^\/(?![/\\])/.test(path);

/**
 * Where to go after logging in: the page that sent the user here (`RequireAuth` puts it in the router
 * state, a link in `?returnTo=`), or the home page.
 */
function returnPath(state: unknown, search: string): string {
  if (typeof state === "object" && state !== null && "from" in state && isAppPath(state.from)) {
    return state.from;
  }
  const returnTo = new URLSearchParams(search).get("returnTo");
  return isAppPath(returnTo) ? returnTo : "/";
}

interface LoginResult {
  error: string | null;
  /** What was typed, put back after a failed attempt. */
  email: string;
}

export function LoginPage() {
  const { state, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = returnPath(location.state, location.search);

  async function logIn(_previous: LoginResult, form: FormData): Promise<LoginResult> {
    const email = String(form.get("email"));
    try {
      signIn(await login({ email, password: String(form.get("password")) }));
      navigate(next, { replace: true });
      return { error: null, email };
    } catch (err) {
      return {
        email,
        error:
          err instanceof ApiError && err.status === 401
            ? "That email and password don't match an account. Check them and try again."
            : "Couldn't log in right now. Try again in a moment.",
      };
    }
  }

  const [result, action, submitting] = useActionState(logIn, { error: null, email: "" });

  // While the form's own sign-in is running, it navigates to `next` itself.
  if (state.status === "signed-in" && !submitting) return <Navigate to={next} replace />;

  return (
    <div className={styles.page}>
      <PageTitle title="Log in" />
      <h1 className={styles.title}>Log in</h1>
      <p className={styles.lead}>Log in to keep track of your orders and prescriptions.</p>
      <form className={styles.form} action={action}>
        <label className={styles.field}>
          Email
          {/* React resets the form after each submit; this keeps the email after a failed one. */}
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={result.email}
          />
        </label>
        <label className={styles.field}>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {result.error && (
          <p role="alert" className={styles.error}>
            {result.error}
          </p>
        )}
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className={styles.switch}>
        New to MedDash?{" "}
        <Link to={{ pathname: "/register", search: location.search }} state={location.state}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
