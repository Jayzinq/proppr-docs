const { GET } = require('./.next/server/app/api/events/search/route.js');

async function run() {
    const req = {
        nextUrl: { searchParams: new URLSearchParams('q=Mexico+vs+Serbia') }
    };
    const res = await GET(req);
    const data = await res.json();
    console.log(data);
}
run();
