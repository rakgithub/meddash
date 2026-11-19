import { Link, Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader/AppHeader";
import { ProductDetailPage, ProductsPage } from "./features/products";

export default function App() {
  return (
    <>
      <AppHeader />
      <main>
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route
            path="*"
            element={
              <div>
                <h1>Page not found</h1>
                <Link to="/">Back to products</Link>
              </div>
            }
          />
        </Routes>
      </main>
    </>
  );
}
