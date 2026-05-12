import type { Metadata } from "next";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ThemeToggle from "../components/theme-toggle";
import BackToTop from "../components/back-to-top";

const editorial = Cormorant_Garamond({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const ui = Space_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GeminEYE – AI Contract Risk Analyzer",
  description: "AI-powered contract risk analyzer. Upload PDFs, DOCX files, or paste text. Get structured investigator-style memos with evidence-backed findings and risk scores.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${editorial.variable} ${ui.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="absolute left-[-9999px] rounded bg-accent px-3 py-2 text-sm font-semibold text-white focus:left-6 focus:top-6 focus:z-50">
          Skip to main content
        </a>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var storedTheme = window.localStorage.getItem('gemineye-theme');
                  var theme = storedTheme === 'light' || storedTheme === 'dark'
                    ? storedTheme
                    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.dataset.theme = theme;
                  document.documentElement.style.colorScheme = theme;
                } catch (error) {
                  document.documentElement.dataset.theme = 'light';
                  document.documentElement.style.colorScheme = 'light';
                }
              })();
            `,
          }}
        />
        <main id="main-content">
          {children}
        </main>
        <BackToTop />
        <ThemeToggle />
      </body>
    </html>
  );
}
