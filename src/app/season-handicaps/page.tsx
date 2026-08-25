import type { Metadata } from "next";
import { SeasonHandicapsClient } from "./SeasonHandicapsClient";

export const revalidate = 0;

export const metadata: Metadata = {
    title: { absolute: "Season Handicaps - Live Handicap League Tables | Proppr" },
    description:
        "Track season handicap betting markets live. Every team's real points plus the bookmaker's handicap, re-ranked as the season unfolds - Premier League, Championship and more, across Bet365, Sporting Index and Spreadex.",
    // Page-level openGraph REPLACES the root layout's (no deep merge), so the
    // image must be restated here or the page ships with no OG image at all.
    openGraph: {
        title: "Season Handicaps - Live Handicap League Tables | Proppr",
        description:
            "The season handicap market, finally trackable: live league tables with each bookmaker's handicap applied.",
        type: "website",
        images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Proppr - Season Handicaps, finally trackable" }],
    },
};

export default function SeasonHandicapsPage() {
    return <SeasonHandicapsClient />;
}
