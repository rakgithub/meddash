import { lazy, Suspense, useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import styles from "./App.module.css";
import { AppFooter } from "./components/AppFooter/AppFooter";
import { AppHeader } from "./components/AppHeader/AppHeader";
import { NotFoundPage } from "./components/NotFoundPage/NotFoundPage";
import { ASK_PARAM, ConsultationProvider, HomePage } from "./features/assistant";
import { AuthProvider, LoginPage, ProfilePage, RegisterPage, RequireAuth } from "./features/auth";
import { CartPage, CartProvider } from "./features/cart";
import { OrderDetailPage, OrdersPage } from "./features/orders";
import {
  hasCatalogueParams,
  ProductDetailPage,
  ProductsPage,
  SHOP_PATH,
} from "./features/products";

// The style guide is for development only; in a production build this folds to null and the page's
// chunk is never emitted.
const StyleGuidePage = import.meta.env.DEV
  ? lazy(() => import("./features/design").then((m) => ({ default: m.StyleGuidePage })))
  : null;

/** `/` is the assistant, but an old catalogue link to it (`/?q=…&category=…`) belongs on `/shop`. */
function HomeRoute() {
  const { search } = useLocation();
  if (hasCatalogueParams(new URLSearchParams(search))) {
    return <Navigate to={{ pathname: SHOP_PATH, search }} replace />;
  }
  return <HomePage />;
}

/**
 * The assistant used to live at `/assistant`. Its `?q=` pre-fill becomes `?ask=` on `/`, because a
 * bare `/?q=` is an old catalogue search.
 */
function AssistantRedirect() {
  const { search } = useLocation();
  const q = new URLSearchParams(search).get("q");
  const next = q ? `?${new URLSearchParams({ [ASK_PARAM]: q })}` : "";
  return <Navigate to={{ pathname: "/", search: next }} replace />;
}

export default function App() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const lastPathname = useRef(pathname);

  // A new page replaces the content without a reload, so move focus to it: otherwise focus stays
  // on the link that was clicked and screen readers say nothing. Only the path counts, so search,
  // filters and paging on `/shop` (query string only) keep focus where the user is.
  useEffect(() => {
    if (pathname === lastPathname.current) return;
    lastPathname.current = pathname;
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <AuthProvider>
      <CartProvider>
        <ConsultationProvider>
          <a className={styles.skipLink} href="#main-content">
            Skip to main content
          </a>
          <AppHeader />
          <main id="main-content" className={styles.main} ref={mainRef} tabIndex={-1}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path={SHOP_PATH} element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/assistant" element={<AssistantRedirect />} />
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
        </ConsultationProvider>
      </CartProvider>
    </AuthProvider>
  );
}
