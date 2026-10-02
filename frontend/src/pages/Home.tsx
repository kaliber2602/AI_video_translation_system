import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import HomeNavbar from "../components/home/HomeNavbar";
import HomeHero from "../components/home/HomeHero";
import HomeFeatures from "../components/home/HomeFeatures";

// Lazy-load below-the-fold components to reduce initial bundle size and DOM nodes
const HomePipeline = lazy(() => import("../components/home/pipeline/HomePipeline"));
const HomeSemanticSearch = lazy(() => import("../components/home/search/HomeSemanticSearch"));
const HomePricing = lazy(() => import("../components/home/HomePricing"));
const HomeAbout = lazy(() => import("../components/home/about/HomeAbout"));
const HomeContact = lazy(() => import("../components/home/contact/HomeContact"));
const HomeCTA = lazy(() => import("../components/home/HomeCTA"));

// Lightweight viewport observer wrapper so dynamic chunks only load when scrolling near
function LazySection({ children, minHeight = "400px" }: { children: ReactNode; minHeight?: string }) {
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldRender) return;

    const el = containerRef.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "350px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldRender]);

  return (
    <div ref={containerRef} style={{ minHeight: shouldRender ? undefined : minHeight }}>
      {shouldRender ? <Suspense fallback={<div style={{ minHeight }} />}>{children}</Suspense> : null}
    </div>
  );
}

export default function Home() {
  // Prefetch authentication routes during idle time so Sign In and Get Started load instantly
  useEffect(() => {
    const prefetchRoutes = () => {
      import("./Login");
      import("./Register");
    };

    if ("requestIdleCallback" in window) {
      const handle = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(
        prefetchRoutes
      );
      return () => {
        if ("cancelIdleCallback" in window) {
          (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle);
        }
      };
    } else {
      const timer = setTimeout(prefetchRoutes, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div
      data-theme="default_theme"
      className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200 page-enter"
    >
      <HomeNavbar />

      <main>
        {/* Above the fold: rendered immediately */}
        <HomeHero />

        {/* Immediate below fold */}
        <HomeFeatures />

        {/* Below fold: viewport lazy-loaded */}
        <LazySection minHeight="600px">
          <HomePipeline />
        </LazySection>

        <LazySection minHeight="500px">
          <HomeSemanticSearch />
        </LazySection>

        <LazySection minHeight="600px">
          <HomePricing />
        </LazySection>

        <LazySection minHeight="500px">
          <HomeAbout />
        </LazySection>

        <LazySection minHeight="500px">
          <HomeContact />
        </LazySection>

        <LazySection minHeight="400px">
          <HomeCTA />
        </LazySection>
      </main>
    </div>
  );
}