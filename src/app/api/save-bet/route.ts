import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { requireSessionForUser } from "@/lib/server/auth";

function resolveSaveBetScript() {
    const candidates = [
        path.join(process.cwd(), "scripts", "save_bet.py"),
        path.join("/opt/proppr-docs", "scripts", "save_bet.py"),
        path.join(process.cwd(), "..", "..", "..", "..", "scripts", "save_bet.py"),
    ];
    return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            userId,
            betType,
            date,
            time,
            country,
            league,
            searchEvent,
            selection,
            market,
            betDirection,
            bookmaker,
            odds,
            stake,
        } = body;

        if (!userId) {
            return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
        }

        const auth = requireSessionForUser(req, userId);
        if (auth instanceof NextResponse) return auth;

        // We will call scripts/save_bet.py with the JSON string
        const scriptPath = resolveSaveBetScript();
        const payload = JSON.stringify(body);
        // Large bodies (bulk import) exceed the OS single-argv limit (~128KB on Linux), so
        // pipe them via stdin with a "-" sentinel instead of passing as a command argument.
        const useStdin = body?.isBulkImport === true || payload.length > 100_000;

        return new Promise<NextResponse>((resolve) => {
            const pythonProcess = spawn("python3", [scriptPath, useStdin ? "-" : payload]);
            if (useStdin) {
                pythonProcess.stdin.write(payload);
                pythonProcess.stdin.end();
            }

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
                    console.error("Save bet script failed:", errorOutput);
                    return resolve(
                        NextResponse.json(
                            // save_bet.py prints its {"error": …} JSON to STDOUT - surface it when
                            // stderr is empty so failures aren't a blank "details".
                            { error: "Failed to save bet", details: errorOutput || output.trim() },
                            { status: 500 }
                        )
                    );
                }

                try {
                    // Try to parse script output to return
                    // Find the last valid JSON string in output
                    const lines = output.trim().split('\n');
                    let jsonStr = null;
                    for (let i = lines.length - 1; i >= 0; i--) {
                        try {
                            JSON.parse(lines[i]);
                            jsonStr = lines[i];
                            break;
                        } catch (e) {
                            continue;
                        }
                    }

                    if (jsonStr) {
                        const parsed = JSON.parse(jsonStr);
                        return resolve(NextResponse.json(parsed, { status: 200 }));
                    } else {
                        return resolve(
                            NextResponse.json({ success: true, message: "Bet saved", raw: output }, { status: 200 })
                        );
                    }
                } catch (e) {
                    return resolve(
                        NextResponse.json(
                            { error: "Failed to parse script output", raw: output },
                            { status: 500 }
                        )
                    );
                }
            });
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
