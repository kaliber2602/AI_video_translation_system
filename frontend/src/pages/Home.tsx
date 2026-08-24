import HomeNavbar from "../components/home/HomeNavbar";
import HomeHero from "../components/home/HomeHero";
import HomeFeatures from "../components/home/HomeFeatures";
import HomePipeline from "../components/home/pipeline/HomePipeline";
import HomeSemanticSearch from "../components/home/search/HomeSemanticSearch";
import HomePricing from "../components/home/HomePricing";
import HomeStats from "../components/home/HomeStats";
import HomeCTA from "../components/home/HomeCTA";

export default function Home() {
  return (
    <div
      data-theme="default_theme"
      className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200 page-enter"
    >
      <HomeNavbar />

      <main>
        <HomeHero />

        <HomeFeatures />

        <HomePipeline />

        <HomeSemanticSearch />

        <HomePricing />

        <HomeStats />

        <HomeCTA />
      </main>
    </div>
  );
}