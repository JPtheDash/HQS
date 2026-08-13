import { chromium } from "playwright";

const VW = 390, VH = 844;
const GAME_W = 720;
const GAME_H = Math.round(Math.min(Math.max(GAME_W * (VH / VW), 1280), 1900));
const SCALE = VW / GAME_W;

function at(gx, gy){
    return { x: Math.round(gx * SCALE), y: Math.round(gy * SCALE) };
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });

const errors = [];
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("console", msg => {
    if(msg.type() === "error") errors.push("console.error: " + msg.text());
});

// Headless Chromium throttles requestAnimationFrame to near-zero for a page
// it considers backgrounded, so Phaser's clock (and anything driven by it,
// like delayedCall) barely advances during a plain waitForTimeout - but each
// CDP round-trip such as page.evaluate() seems to pump one frame regardless.
// Polling on that rather than trusting a fixed wall-clock wait is what
// actually gets us to the next scene in a headless run.
async function waitForScene(key, timeoutMs = 15000){

    const start = Date.now();

    while(Date.now() - start < timeoutMs){

        const scenes = await page.evaluate(
            () => window.__game.scene.getScenes(true).map(s => s.scene.key)
        );

        if(scenes.includes(key)){

            return scenes;

        }

        await page.waitForTimeout(120);

    }

    throw new Error(`timed out waiting for scene "${key}"`);

}

await page.goto("http://localhost:5183/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: "/tmp/hqs-1-home.png" });

// Tap "BEGIN THE QUEST" button
let p = at(GAME_W / 2, GAME_H - 190);
await page.mouse.click(p.x, p.y);
await waitForScene("Cinematic");
await page.screenshot({ path: "/tmp/hqs-2-cinematic.png" });

// Tap through the remaining slides via the full-screen tap catcher.
p = at(GAME_W / 2, GAME_H / 2);
for(let i = 0; i < 6; i++){
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(150);
}

await waitForScene("Game");
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/hqs-3-game.png" });

// Tap-jump a few times
for(let i = 0; i < 3; i++){
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    for(let j = 0; j < 4; j++){ await page.evaluate(() => 0); await page.waitForTimeout(80); }
}
await page.screenshot({ path: "/tmp/hqs-4-jumping.png" });

// Hold for flight
await page.mouse.down();
for(let j = 0; j < 8; j++){ await page.evaluate(() => 0); await page.waitForTimeout(80); }
await page.mouse.up();
await page.screenshot({ path: "/tmp/hqs-5-flying.png" });

for(let j = 0; j < 15; j++){ await page.evaluate(() => 0); await page.waitForTimeout(150); }
await page.screenshot({ path: "/tmp/hqs-6-later.png" });

console.log("ERRORS:", JSON.stringify(errors, null, 2));

await browser.close();
