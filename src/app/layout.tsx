import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.proppr.io"),
  title: {
    default: "Proppr – Stop Juggling 4 Tabs to Place One Bet",
    template: "%s | Proppr Docs",
  },
  description:
    "Player props, team stats, and arbitrage alerts via Telegram. Replace Oddschecker, SofaScore, FlashScore, and FotMob with one command. Powered by the Cebro statistical model - no AI hallucinations.",
  keywords: [
    "football betting bot",
    "player prop value betting",
    "football arbitrage finder",
    "Telegram betting alerts",
    "Premier League betting",
    "anytime goalscorer odds",
    "shots on target betting",
    "corners betting analysis",
    "expected value betting",
    "EV betting calculator",
    "Proppr bot",
    "Cebro model",
    "value betting tool",
    "football statistics bot",
    "bookmaker odds comparison",
  ],
  authors: [{ name: "Proppr", url: "https://docs.proppr.io" }],
  creator: "Proppr",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://docs.proppr.io",
    siteName: "Proppr",
    title: "Stop Juggling 4 Tabs to Place One Bet | Proppr",
    description:
      "Replace Oddschecker, SofaScore, FlashScore, and FotMob with one Telegram command. Player props, team stats, arbitrage alerts. Powered by the Cebro model - no AI.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Proppr – Close the tabs. Open Telegram.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stop Juggling 4 Tabs to Place One Bet",
    description:
      "1,000+ bettors replaced their multi-tab workflow with one Telegram command. Player props, team stats, arbitrage. No AI hallucinations.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "./",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Proppr",
  applicationCategory: "SportsApplication",
  operatingSystem: "Telegram",
  url: "https://docs.proppr.io",
  description:
    "Football betting intelligence via Telegram. Player props, team stats, and arbitrage alerts powered by the Cebro statistical model. Replace 4 browser tabs with one command.",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
      name: "Reserve (Free)",
    },
    {
      "@type": "Offer",
      price: "9.99",
      priceCurrency: "GBP",
      name: "Bench Player",
    },
    {
      "@type": "Offer",
      price: "23.99",
      priceCurrency: "GBP",
      name: "Regular Starter",
    },
    {
      "@type": "Offer",
      price: "35.99",
      priceCurrency: "GBP",
      name: "Club Legend",
    },
    {
      "@type": "Offer",
      price: "45.99",
      priceCurrency: "GBP",
      name: "Club Legend Bundle (Player + Team)",
    },
    {
      "@type": "Offer",
      price: "429.99",
      priceCurrency: "GBP",
      name: "Lifetime - All Bots",
    },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "1000",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${outfit.variable} antialiased bg-background text-foreground min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
