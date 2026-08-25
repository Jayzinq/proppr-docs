import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const base = "https://docs.proppr.io";
    const routes = [
        { url: "/", priority: 1.0, changeFrequency: "weekly" as const },
        { url: "/quickstart", priority: 0.9, changeFrequency: "monthly" as const },
        { url: "/refer-and-earn", priority: 0.8, changeFrequency: "monthly" as const },
        { url: "/player-bot", priority: 0.9, changeFrequency: "monthly" as const },
        { url: "/player-bot/commands", priority: 0.8, changeFrequency: "monthly" as const },
        { url: "/player-bot/settings", priority: 0.7, changeFrequency: "monthly" as const },
        { url: "/team-bot", priority: 0.9, changeFrequency: "monthly" as const },
        { url: "/team-bot/commands", priority: 0.8, changeFrequency: "monthly" as const },
        { url: "/team-bot/insights", priority: 0.7, changeFrequency: "monthly" as const },
        { url: "/arb-bot", priority: 0.9, changeFrequency: "monthly" as const },
        { url: "/arb-bot/commands", priority: 0.8, changeFrequency: "monthly" as const },
        { url: "/arb-bot/settings", priority: 0.7, changeFrequency: "monthly" as const },
    ];

    return routes.map(({ url, priority, changeFrequency }) => ({
        url: `${base}${url}`,
        lastModified: new Date(),
        changeFrequency,
        priority,
    }));
}
