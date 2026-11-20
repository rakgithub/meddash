import { Link, Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader/AppHeader";
import { AssistantPage } from "./features/assistant";
import { AuthProvider, LoginPage, RegisterPage } from "./features/auth";
import { ProductDetailPage, ProductsPage } from "./features/products";

export default function App() {
  return (
    <AuthProvider>
      <AppHeader />
      <main>
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
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
    </AuthProvider>
  );
}
