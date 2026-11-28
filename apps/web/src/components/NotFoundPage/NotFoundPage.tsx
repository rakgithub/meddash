import { Link } from "react-router-dom";
import { PageTitle } from "../../lib/PageTitle";

export function NotFoundPage() {
  return (
    <div>
      <PageTitle title="Page not found" />
      <h1>Page not found</h1>
      <Link to="/">Back to products</Link>
    </div>
  );
}
