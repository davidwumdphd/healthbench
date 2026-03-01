import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthBench Rubric Visualizer",
  description:
    "Interactive explorer for HealthBench evaluation rubrics — browse questions, view rubric criteria, and filter by tags.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="header-inner">
            <a href="/" className="logo">
              <div className="logo-icon">🏥</div>
              HealthBench <span>Rubric Visualizer</span>
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
