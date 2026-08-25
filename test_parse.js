const fs = require('fs');
async function run() {
    const imgStr = fs.readFileSync("/Users/zinq/.gemini/antigravity-cli/brain/77ef7c1b-7e56-4663-b977-04ab15b6fdfe/drag_drop_error.png", "base64");
    const res = await fetch("https://docs.proppr.io/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: ["data:image/png;base64," + imgStr] })
    });
    console.log(await res.text());
}
run();
