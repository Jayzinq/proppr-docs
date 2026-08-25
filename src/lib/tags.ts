export function collectTagsFromBets(bets: any[]): string[] {
    const tagSet = new Set<string>();
    for (const bet of bets || []) {
        for (const tag of normalizeBetTags(bet)) {
            tagSet.add(tag);
        }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

export function normalizeBetTags(bet: any): string[] {
    const tags: string[] = [];
    // Comma is ALWAYS a tag separator - split every source (array elements AND sync_label, not
    // just a bare string), so a value like "Inplay Free's, Cyclops" becomes two tags rather than
    // one. Dedup per bet so a tag repeated across sources (tags + sync_label) counts once.
    const push = (v: any) => {
        String(v ?? "").split(",").forEach((part) => {
            const value = part.trim();
            if (value) tags.push(value);
        });
    };
    const raw = bet?.tags;
    if (Array.isArray(raw)) raw.forEach(push);
    else if (typeof raw === "string" && raw.trim()) push(raw);
    const syncLabel = String(bet?.sync_label || bet?.syncLabel || "").trim();
    if (syncLabel) push(syncLabel);
    return Array.from(new Set(tags));
}

export function betHasTags(bet: any): boolean {
    return normalizeBetTags(bet).length > 0;
}

export function selectedTagsFromInput(value: string): string[] {
    const idx = value.lastIndexOf(",");
    const prefix = idx === -1 ? "" : value.slice(0, idx);
    return prefix.split(",").map((tag) => tag.trim()).filter(Boolean);
}

export function currentTagFragment(value: string): string {
    const idx = value.lastIndexOf(",");
    return (idx === -1 ? value : value.slice(idx + 1)).trim();
}

export function parseTagsInput(value: string): string[] {
    return value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
}