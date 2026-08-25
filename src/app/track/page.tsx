import type { Metadata } from "next";
import TrackDashboardPage from "./TrackDashboardClient";

export const metadata: Metadata = {
    title: { absolute: "Proppr Track - Free Bet Tracker" },
    description:
        "Track every bet automatically, measure your closing-line value, and see where your edge really comes from.",
};

export default function TrackPage() {
    return <TrackDashboardPage />;
}
