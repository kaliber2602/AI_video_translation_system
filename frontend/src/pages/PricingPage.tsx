import HomeNavbar from "../components/home/HomeNavbar";
import HomePricing from "../components/home/HomePricing";
import HomeCTA from "../components/home/HomeCTA";

export default function PricingPage() {
  return (
    <div
      data-theme="default_theme"
      className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200 page-enter"
    >
      <HomeNavbar />

      <main>
        <HomePricing />
        <HomeCTA />
      </main>
    </div>
  );
}
