import { lazy, Suspense, useEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import styles from "./App.module.css";
import { AppFooter } from "./components/AppFooter/AppFooter";
import { AppHeader } from "./components/AppHeader/AppHeader";
import { NotFoundPage } from "./components/NotFoundPage/NotFoundPage";
import { AssistantPage } from "./features/assistant";
import { AuthProvider, LoginPage, ProfilePage, RegisterPage, RequireAuth } from "./features/auth";
import { CartPage, CartProvider } from "./features/cart";
import { OrderDetailPage, OrdersPage } from "./features/orders";
import { ProductDetailPage, ProductsPage } from "./features/products";

// The style guide is for development only; in a production build this folds to null and the page's
// chunk is never emitted.
const StyleGuidePage = import.meta.env.DEV
  ? lazy(() => import("./features/design").then((m) => ({ default: m.StyleGuidePage })))
  : null;

export default function App() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const lastPathname = useRef(pathname);

  // A new page replaces the content without a reload, so move focus to it: otherwise focus stays
  // on the link that was clicked and screen readers say nothing. Only the path counts, so search,
  // filters and paging on `/` (query string only) keep focus where the user is.
  useEffect(() => {
    if (pathname === lastPathname.current) return;
    lastPathname.current = pathname;
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <AuthProvider>
      <CartProvider>
        <a className={styles.skipLink} href="#main-content">
          Skip to main content
        </a>
        <AppHeader />
        <main id="main-content" className={styles.main} ref={mainRef} tabIndex={-1}>
          <Routes>
            <Route path="/" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route
              path="/assistant"
              element={
                <RequireAuth>
                  <AssistantPage />
                </RequireAuth>
              }
            />
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
            {StyleGuidePage && (
              <Route
                path="/design"
                element={
                  <Suspense fallback={<p>Loading the style guide…</p>}>
                    <StyleGuidePage />
                  </Suspense>
                }
              />
            )}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <AppFooter />
      </CartProvider>
    </AuthProvider>
  );
}
