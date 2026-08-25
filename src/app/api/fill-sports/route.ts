import { NextRequest, NextResponse } from "next/server";
import { requireSessionForUser } from "@/lib/server/auth";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveScript() {
    const candidates = [
        path.join(process.cwd(), "scripts", "fill_missing_sports.py"),
        path.join("/opt/proppr-docs", "scripts", "fill_missing_sports.py"),
    ];
    return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const userId = body?.userId ?? body?.user_id;
        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 });
        }

        const auth = requireSessionForUser(req, userId);
        if (auth instanceof NextResponse) return auth;

        const scriptPath = resolveScript();
        const payload = JSON.stringify({ userId });

        return await new Promise<NextResponse>((resolve) => {
            const pythonProcess = spawn("python3", [scriptPath, payload]);
            let output = "";
            let errorOutput = "";

            pythonProcess.stdout.on("data", (data) => {
                output += data.toString();
            });
            pythonProcess.stderr.on("data", (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on("close", (code) => {
                if (code !== 0) {
                    resolve(NextResponse.json(
                        { error: "fill-sports failed", details: errorOutput || output },
                        { status: 500 },
                    ));
                    return;
                }
                try {
                    const lines = output.trim().split("\n");
                    const jsonStr = lines[lines.length - 1];
                    const parsed = JSON.parse(jsonStr);
                    resolve(NextResponse.json(parsed));
                } catch {
                    resolve(NextResponse.json({ error: "Failed to parse script output", raw: output }, { status: 500 }));
                }
            });
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
    }
}