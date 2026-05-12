import type { Metadata } from "next";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ThemeToggle from "../components/theme-toggle";
import BackToTop from "../components/back-to-top";

const editorial = Cormorant_Garamond({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ui = Space_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
        {children}
        <BackToTop />
        <ThemeToggle />
      </body>
    </html>
  );
}
