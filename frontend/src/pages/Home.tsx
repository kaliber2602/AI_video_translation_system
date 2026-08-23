import HomeNavbar from "../components/home/HomeNavbar";
import HomeHero from "../components/home/HomeHero";
import HomeFeatures from "../components/home/HomeFeatures";
import HomeStats from "../components/home/HomeStats";
import HomeCTA from "../components/home/HomeCTA";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200">
      <HomeNavbar />

      <main>
        <HomeHero />

        <HomeFeatures />

        <HomeStats />

        <HomeCTA />
      </main>
    </div>
  );
}