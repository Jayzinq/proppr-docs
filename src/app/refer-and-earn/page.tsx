"use client";

import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
    ArrowRight,
    Copy,
    Gift,
    Globe,
    Network,
    Camera,
    TrendingUp,
    Users,
    Video,
    MessageSquareShare,
    BadgePoundSterling,
} from "lucide-react";

const standardRates = [
    { label: "Direct Circle", value: "25%", detail: "Someone joins through your link or code and subscribes." },
    { label: "Extended Circle", value: "5%", detail: "That person then refers someone else who subscribes." },
    { label: "Network Reach", value: "3%", detail: "The next layer of the tree keeps the residual chain moving." },
];

const vipRates = [
    { label: "Direct Circle", value: "35%", detail: "VIP partners earn more on every direct conversion." },
    { label: "Extended Circle", value: "10%", detail: "VIP status deepens the second layer of residual income." },
    { label: "Network Reach", value: "5%", detail: "Even the third layer remains meaningfully monetized." },
];

const directExample = [
    {
        title: "Arb Bot Premium",
        subtitle: "Direct Circle",
        plan: "£23.99 plan",
        add: "+£6.00",
        total: "Running total: £6.00",
    },
    {
        title: "Player Regular Starter",
        subtitle: "Direct Circle",
        plan: "£23.99 plan",
        add: "+£6.00",
        total: "Running total: £12.00",
    },
    {
        title: "Team Club Legend",
        subtitle: "Direct Circle",
        plan: "£19.99 plan",
        add: "+£5.00",
        total: "Running total: £17.00",
    },
];

const secondLayerExample = [
    {
        label: "Arb user refers a Player user",
        add: "+£1.20",
        total: "Running total: £18.20",
        detail: "5% of one Player Bot Regular Starter subscription in your second layer.",
    },
    {
        label: "Player user refers a Team user",
        add: "+£1.00",
        total: "Running total: £19.20",
        detail: "5% of one Team Bot Club Legend subscription under your network.",
    },
    {
        label: "Team user refers an Arb user",
        add: "+£1.20",
        total: "Running total: £20.40",
        detail: "5% of one Arb Bot Premium subscription on another branch.",
    },
];

const thirdLayerExample = [
    {
        label: "Third layer keeps compounding",
        add: "+£0.60",
        total: "Running total: £21.00",
        detail: "3% of a Team Bot Club Legend subscriber in your third layer.",
    },
    {
        label: "A new bot mix can appear",
        add: "+£0.72",
        total: "Running total: £21.72",
        detail: "3% of a £23.99 subscriber on another branch of the tree.",
    },
    {
        label: "Residuals stay bot-agnostic",
        add: "+£0.72",
        total: "Running total: £22.44",
        detail: "A third paid user in layer three pushes the monthly example higher again.",
    },
];

const distributionIdeas = [
    {
        title: "X / Twitter",
        icon: Globe,
        color: "emerald",
        bullets: [
            "Post winning bet slips or bot screenshots with your referral tag in the caption.",
            "Pin a thread explaining what Proppr does and finish it with your invite link.",
            "Reply to football betting conversations with value-first posts instead of spammy promos.",
        ],
    },
    {
        title: "Instagram",
        icon: Camera,
        color: "amber",
        bullets: [
            "Use Stories to share alerts, then add your code as the CTA for the first-month discount.",
            "Turn referral wins into carousel posts: alert, result, value, then your invite link.",
            "Keep a Referral highlight that explains the discount and recurring rewards clearly.",
        ],
    },
    {
        title: "TikTok",
        icon: Video,
        color: "sky",
        bullets: [
            "Record quick breakdowns of how one alert became a profitable bet.",
            "Show the bot workflow on screen, then finish with your promo code overlay.",
            "Use recurring formats so viewers start expecting the link in every post.",
        ],
    },
    {
        title: "Private Channels",
        icon: MessageSquareShare,
        color: "purple",
        bullets: [
            "Share the code in group chats, Discord servers, and betting communities you already contribute to.",
            "Offer friends a first-month discount instead of just telling them to subscribe.",
            "Bundle your link with genuine guidance on which bot fits them best: Player, Team, or Arb.",
        ],
    },
];

const colorClasses: Record<string, { chip: string; border: string; icon: string }> = {
    emerald: { chip: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-400" },
    amber: { chip: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-400" },
    sky: { chip: "bg-sky-500/10", border: "border-sky-500/20", icon: "text-sky-400" },
    purple: { chip: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", icon: "text-fuchsia-400" },
};

function RateCard({
    title,
    eyebrow,
    rates,
    accent,
}: {
    title: string;
    eyebrow: string;
    rates: { label: string; value: string; detail: string }[];
    accent: "emerald" | "amber";
}) {
    const styles =
        accent === "emerald"
            ? "border-emerald-500/20 bg-emerald-500/[0.06]"
            : "border-amber-400/20 bg-amber-400/[0.06]";

    const text =
        accent === "emerald"
            ? "text-emerald-400"
            : "text-amber-400";

    return (
        <div className={`rounded-3xl border p-6 md:p-8 ${styles}`}>
            <div className={`font-mono text-[11px] uppercase tracking-[0.22em] ${text} mb-3`}>{eyebrow}</div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-6">{title}</h3>
            <div className="space-y-4">
                {rates.map((rate) => (
                    <div key={rate.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-4 mb-2">
                            <span className="text-white font-bold uppercase tracking-wide text-sm">{rate.label}</span>
                            <span className={`text-2xl font-black ${text}`}>{rate.value}</span>
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed">{rate.detail}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ReferAndEarnPage() {
    return (
        <div className="relative min-h-screen flex flex-col bg-[#101010] text-foreground overflow-x-hidden">
            <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:46px_46px]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[540px] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[520px] h-[420px] bg-sky-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 flex flex-col flex-1">
                <Header />

                <main className="flex-1">
                    <section className="max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start"
                        >
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
                                    <Gift className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400 font-mono text-[10px] uppercase tracking-[0.22em] font-bold">
                                        Refer and Earn
                                    </span>
                                </div>

                                <h1 className="text-5xl sm:text-7xl font-black text-white leading-[0.9] tracking-tighter uppercase mb-6 italic">
                                    Turn One Link
                                    <br />
                                    Into <span className="text-emerald-400">Recurring Income</span>
                                </h1>

                                <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl mb-8 font-light">
                                    Proppr referrals are built for compounding. Share your invite link or promo code once,
                                    help a new user get started, and earn monthly residual commission while they stay subscribed.
                                    If they go on to refer others, your network can keep expanding underneath you.
                                </p>

                                <div className="grid sm:grid-cols-3 gap-4">
                                    {[
                                        { label: "Residual Structure", value: "3 Layers", icon: Network },
                                        { label: "Standard First-Month Discount", value: "10%", icon: Gift },
                                        { label: "VIP First-Month Discount", value: "25%", icon: BadgePoundSterling },
                                    ].map((item) => (
                                        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                            <item.icon className="w-5 h-5 text-emerald-400 mb-3" />
                                            <div className="text-2xl font-black text-white">{item.value}</div>
                                            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 mt-1">{item.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, x: 24 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.15 }}
                                className="rounded-3xl border border-white/10 bg-[#101010] p-6 md:p-8"
                            >
                                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500 mb-4">
                                    Referral Flow
                                </div>
                                <div className="space-y-4">
                                    {[
                                        {
                                            step: "01",
                                            title: "Share your referral link or promo code",
                                            body: "Post it publicly or send it directly to people who would actually use Player Bot, Team Bot, or Arb Bot.",
                                        },
                                        {
                                            step: "02",
                                            title: "New subscriber joins your network",
                                            body: "Deep links or promo-code attribution lock the user to your referral tree when they subscribe.",
                                        },
                                        {
                                            step: "03",
                                            title: "Residual commission continues monthly",
                                            body: "As long as the referred subscriber stays active, the recurring commission engine keeps tracking their invoices.",
                                        },
                                    ].map((item) => (
                                        <div key={item.step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                                            <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 font-black">
                                                {item.step}
                                            </div>
                                            <div>
                                                <div className="text-white font-bold uppercase tracking-wide text-sm mb-1">{item.title}</div>
                                                <p className="text-sm text-zinc-400 leading-relaxed">{item.body}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>
                    </section>

                    <section className="border-y border-white/10 bg-white/[0.02]">
                        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
                            <div className="max-w-3xl mb-10">
                                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400 mb-3">Commission Structure</div>
                                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4 italic">
                                    Two Referral Tracks
                                </h2>
                                <p className="text-zinc-400 text-lg leading-relaxed">
                                    Every user can earn on a three-layer residual tree. VIP partners unlock stronger rates and a larger first-month
                                    discount for the people they bring in.
                                </p>
                            </div>

                            <div className="grid xl:grid-cols-2 gap-6">
                                <RateCard title="Standard Referral" eyebrow="Open to all users" rates={standardRates} accent="emerald" />
                                <RateCard title="VIP Referral" eyebrow="Admin-upgraded or Founder tier" rates={vipRates} accent="amber" />
                            </div>
                        </div>
                    </section>

                    <section className="max-w-7xl mx-auto px-4 md:px-6 py-20">
                        <div className="max-w-3xl mb-12">
                            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400 mb-3">Network Effect</div>
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4 italic">
                                One Referral Can Branch Fast
                            </h2>
                            <p className="text-zinc-400 text-lg leading-relaxed">
                                The goal is not just getting one subscriber. It is building a tree. If the people you refer also start
                                sharing Proppr, your original link can create several overlapping streams of recurring revenue.
                            </p>
                        </div>

                        <div className="rounded-[2rem] border border-white/10 bg-[#101010] p-6 md:p-10 overflow-hidden">
                            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
                                <div>
                                    <div className="relative flex flex-col items-center gap-8 py-4">
                                        <div className="w-full max-w-[220px] rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-center">
                                            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-400 font-mono mb-2">You</div>
                                            <div className="text-white font-black text-2xl uppercase">Root Referrer</div>
                                            <div className="text-zinc-400 text-sm mt-2">The starting point for the entire network.</div>
                                        </div>

                                        <div className="w-px h-12 bg-gradient-to-b from-emerald-400/60 to-white/10" />

                                        <div className="grid md:grid-cols-3 gap-4 w-full">
                                            {directExample.map((node) => (
                                                <div key={node.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center relative">
                                                    <Users className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                                                    <div className="text-white font-bold uppercase text-sm">{node.title}</div>
                                                    <div className="text-zinc-500 text-xs uppercase tracking-[0.2em] mt-1">{node.subtitle}</div>
                                                    <div className="text-zinc-300 text-sm mt-2">{node.plan}</div>
                                                    <div className="text-emerald-400 font-black text-lg mt-2">{node.add}</div>
                                                    <div className="text-zinc-500 text-xs mt-1">{node.total}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-4 w-full">
                                            {secondLayerExample.map((item) => (
                                                <div key={item.label} className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-center">
                                                    <div className="text-white font-semibold text-sm">{item.label}</div>
                                                    <div className="text-emerald-400 font-black text-lg mt-2">{item.add}</div>
                                                    <div className="text-zinc-500 text-xs mt-1">{item.total}</div>
                                                    <div className="text-zinc-500 text-xs mt-2">{item.detail}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-4 w-full">
                                            {thirdLayerExample.map((item) => (
                                                <div key={item.label} className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-center">
                                                    <div className="text-white font-semibold text-sm">{item.label}</div>
                                                    <div className="text-emerald-400 font-black text-lg mt-2">{item.add}</div>
                                                    <div className="text-zinc-500 text-xs mt-1">{item.total}</div>
                                                    <div className="text-zinc-500 text-xs mt-2">{item.detail}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] p-5 text-center">
                                            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400 mb-2">
                                                Example Monthly Total
                                            </div>
                                            <div className="text-white font-black text-3xl">£22.44</div>
                                            <p className="text-zinc-300 text-sm leading-relaxed mt-2 max-w-2xl mx-auto">
                                                In this example, three direct paid referrals lead to extra paid subscribers across the second
                                                and third layers, taking the running monthly total from <span className="font-black text-white">£17.00</span> on
                                                the direct circle alone to <span className="font-black text-white">£22.44</span> per month.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        "Your direct referrals are the highest-value layer.",
                                        "If they start sharing their own codes, your second layer begins to build.",
                                        "If that second layer keeps spreading, your third layer adds another stream of monthly residuals.",
                                        "The tree compounds best when you attract people who actually post, share, and sell the bots well.",
                                    ].map((point, index) => (
                                        <div key={point} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 font-black text-sm">
                                                {index + 1}
                                            </div>
                                            <p className="text-sm text-zinc-400 leading-relaxed">{point}</p>
                                        </div>
                                    ))}
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
                                        <div className="flex items-center gap-3 mb-3">
                                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                                            <div className="text-white font-black uppercase tracking-wide text-sm">What scales best</div>
                                        </div>
                                        <p className="text-sm text-zinc-300 leading-relaxed">
                                            The strongest referrers do not just drop links. They create proof, show real use cases,
                                            and make it obvious why someone should join through them today instead of “checking it out later.”
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="border-y border-white/10 bg-white/[0.02]">
                        <div className="max-w-7xl mx-auto px-4 md:px-6 py-20">
                            <div className="max-w-3xl mb-12">
                                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400 mb-3">Distribution Playbook</div>
                                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4 italic">
                                    How to Actually Get Referrals
                                </h2>
                                <p className="text-zinc-400 text-lg leading-relaxed">
                                    The best referral strategy is distribution with context. Show what the bots do, show why they are useful,
                                    and make the discount part of the invitation.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {distributionIdeas.map((idea, index) => {
                                    const colors = colorClasses[idea.color];
                                    return (
                                        <motion.div
                                            key={idea.title}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.08 }}
                                            viewport={{ once: true }}
                                            className={`rounded-3xl border ${colors.border} ${colors.chip} p-6`}
                                        >
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className={`w-12 h-12 rounded-2xl border ${colors.border} bg-black/20 flex items-center justify-center`}>
                                                    <idea.icon className={`w-5 h-5 ${colors.icon}`} />
                                                </div>
                                                <div className="text-white font-black uppercase tracking-tight text-xl">{idea.title}</div>
                                            </div>
                                            <ul className="space-y-3">
                                                {idea.bullets.map((bullet) => (
                                                    <li key={bullet} className="flex gap-3 text-sm text-zinc-300 leading-relaxed">
                                                        <ArrowRight className={`w-4 h-4 mt-0.5 shrink-0 ${colors.icon}`} />
                                                        <span>{bullet}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <section className="max-w-7xl mx-auto px-4 md:px-6 py-20">
                        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-start">
                            <div className="rounded-3xl border border-white/10 bg-[#101010] p-6 md:p-8">
                                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400 mb-3">Simple Playbook</div>
                                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-6 italic">
                                    The Referral Loop
                                </h2>
                                <div className="space-y-4">
                                    {[
                                        "Create a content loop: alert, result, proof, link.",
                                        "Use your promo code as the entry-level offer for new users.",
                                        "Tell people which bot fits them best instead of sending one generic pitch.",
                                        "Keep posting. Referral systems reward consistency more than occasional bursts.",
                                    ].map((item) => (
                                        <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                            <Copy className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                            <p className="text-sm text-zinc-400 leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6 md:p-8">
                                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400 mb-3">Why It Works</div>
                                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-4 italic">
                                    Discount Up Front.
                                    <br />
                                    Residuals On The Back End.
                                </h2>
                                <p className="text-zinc-300 text-lg leading-relaxed mb-8">
                                    The referral engine gives the new subscriber a first-month reason to act now, while the referrer
                                    earns from the long-term subscription relationship. That is what makes the model durable.
                                </p>

                                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                                        <div className="text-zinc-500 text-xs uppercase tracking-[0.2em] mb-2">For New Users</div>
                                        <div className="text-white font-bold text-lg mb-2">Lower friction to subscribe</div>
                                        <p className="text-sm text-zinc-400">A first-month discount makes trying Proppr feel easier and more immediate.</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                                        <div className="text-zinc-500 text-xs uppercase tracking-[0.2em] mb-2">For Referrers</div>
                                        <div className="text-white font-bold text-lg mb-2">Recurring upside over time</div>
                                        <p className="text-sm text-zinc-400">The stronger the retention, the more valuable every referred subscriber becomes.</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <a
                                        href="https://t.me/propprplayerbot?start=1"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black px-6 py-3 rounded-xl transition-all hover:scale-105 uppercase tracking-wide"
                                    >
                                        Open Proppr
                                    </a>
                                    <a
                                        href="/quickstart"
                                        className="inline-flex items-center gap-2 border border-white/10 hover:bg-white/5 text-white font-black px-6 py-3 rounded-xl transition-all uppercase tracking-wide"
                                    >
                                        Read the Docs
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                <Footer />
            </div>
        </div>
    );
}
