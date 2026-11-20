import { Link, Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader/AppHeader";
import { AssistantPage } from "./features/assistant";
import { AuthProvider, LoginPage, ProfilePage, RegisterPage, RequireAuth } from "./features/auth";
import { CartPage, CartProvider } from "./features/cart";
import { OrderDetailPage, OrdersPage } from "./features/orders";
import { ProductDetailPage, ProductsPage } from "./features/products";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppHeader />
        <main>
          <Routes>
            <Route path="/" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/cart"
              element={
                <RequireAuth>
                  <CartPage />
                </RequireAuth>
              }
            />
            <Route
              path="/orders"
              element={
                <RequireAuth>
                  <OrdersPage />
                </RequireAuth>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <RequireAuth>
                  <OrderDetailPage />
                </RequireAuth>
              }
            />
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
      </CartProvider>
    </AuthProvider>
  );
}
