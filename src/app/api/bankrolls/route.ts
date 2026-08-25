import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { requireSessionForUser, requireSessionOrLegacyRead } from '@/lib/server/auth';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const userId = body?.userId ?? body?.user_id;
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        // "get" is a read dispatched over POST - it stays on the legacy window;
        // create/update/delete are real mutations and need a session.
        const auth = body?.action === 'get'
            ? requireSessionOrLegacyRead(req, userId)
            : requireSessionForUser(req, userId);
        if (auth instanceof NextResponse) return auth;

        return new Promise<NextResponse>((resolve) => {
            const scriptPath = path.join(process.cwd(), 'scripts', 'bankrolls.py');
            const pythonProcess = spawn('python3', [scriptPath, JSON.stringify(body)]);
            
            let dataString = '';
            let errorString = '';

            pythonProcess.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorString += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error('Python script error:', errorString);
                    resolve(NextResponse.json({ error: errorString || 'Python script failed' }, { status: 500 }));
                    return;
                }
                
                try {
                    const result = JSON.parse(dataString);
                    resolve(NextResponse.json(result));
                } catch (e) {
                    console.error('Failed to parse Python output:', dataString);
                    resolve(NextResponse.json({ error: 'Invalid output from python script' }, { status: 500 }));
                }
            });
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}
