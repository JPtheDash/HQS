// There is no illustrated art yet - the "Disney/Pixar-inspired" pass the
// concept doc asks for is a separate, later effort. Everything the game
// draws today is generated at boot from Phaser.Graphics so the project is
// playable and its silhouettes/readability can be judged before a single
// commissioned asset exists. Swapping any key here for a loaded spritesheet
// later needs no change outside this file - every other scene only ever
// asks for a texture by name.

const GOLD = 0xf2b33d;
const GOLD_DARK = 0xc9861a;
const CROWN_RED = 0xb1273a;

/**
 * Builds every texture the game draws from. Call once, from BootScene.
 */
export default function generatePlaceholderTextures(scene){

    hanuman(scene);
    warrior(scene);
    cloudPlatform(scene);
    ledgePlatform(scene);
    groundTile(scene);
    thornBush(scene);
    boulder(scene);
    fireZone(scene);
    banana(scene);
    herb(scene);
    coin(scene);
    lotus(scene);
    finishGate(scene);
    glow(scene);
    skyLayer(scene, "sky-far", 0x2c4f8c, 0x0f1f3f);
    hillLayer(scene);

}

/** Hanuman himself: a simple golden monkey silhouette, readable at a glance. */
function hanuman(scene){

    const w = 90, h = 120;
    const g = scene.add.graphics();

    // Tail, drawn first so the body overlaps its base
    g.lineStyle(10, GOLD_DARK, 1);
    g.beginPath();
    g.arc(w * 0.28, h * 0.62, 34, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(40), true);
    g.strokePath();

    // Body
    g.fillStyle(GOLD, 1);
    g.fillEllipse(w * 0.55, h * 0.62, w * 0.62, h * 0.58);

    // Head
    g.fillCircle(w * 0.55, h * 0.28, w * 0.32);

    // Ears
    g.fillCircle(w * 0.3, h * 0.22, w * 0.13);
    g.fillCircle(w * 0.8, h * 0.22, w * 0.13);

    // Muzzle
    g.fillStyle(0xffe3ad, 1);
    g.fillEllipse(w * 0.55, h * 0.34, w * 0.34, h * 0.22);

    // Mukut (crown), the one instantly-recognisable prop
    g.fillStyle(CROWN_RED, 1);
    g.fillTriangle(w * 0.4, h * 0.08, w * 0.55, -h * 0.08, w * 0.7, h * 0.08);
    g.fillStyle(GOLD, 1);
    g.fillCircle(w * 0.55, -h * 0.02, 6);

    // Limbs, simple rounded bars
    g.fillStyle(GOLD_DARK, 1);
    g.fillRoundedRect(w * 0.18, h * 0.55, 14, 42, 7);
    g.fillRoundedRect(w * 0.78, h * 0.5, 14, 42, 7);
    g.fillRoundedRect(w * 0.4, h * 0.95, 16, 30, 8);
    g.fillRoundedRect(w * 0.62, h * 0.95, 16, 30, 8);

    g.generateTexture("hanuman", w, h + 30);
    g.destroy();

}

/**
 * A plain humanoid silhouette, drawn in flat white so setTint() can recolour
 * it per-character. Stands in for Rama, Lakshmana and the Vanara/Rakshasa
 * armies in the cinematic - none of whom have their own art yet.
 */
function warrior(scene){

    const w = 60, h = 116;
    const g = scene.add.graphics();

    g.fillStyle(0xffffff, 1);
    g.fillCircle(w * 0.5, h * 0.16, w * 0.22);
    g.fillRoundedRect(w * 0.22, h * 0.3, w * 0.56, h * 0.42, 10);
    g.fillRoundedRect(w * 0.06, h * 0.33, w * 0.18, h * 0.32, 8);
    g.fillRoundedRect(w * 0.76, h * 0.33, w * 0.18, h * 0.32, 8);
    g.fillRoundedRect(w * 0.28, h * 0.7, w * 0.18, h * 0.3, 8);
    g.fillRoundedRect(w * 0.54, h * 0.7, w * 0.18, h * 0.3, 8);

    g.generateTexture("warrior", w, h);
    g.destroy();

}

/** A second pose, wings-out, used while flying/diving. */
function skyLayer(scene, key, top, bottom){

    const w = 32, h = 512;
    const g = scene.add.graphics();

    g.fillGradientStyle(top, top, bottom, bottom, 1);
    g.fillRect(0, 0, w, h);

    g.generateTexture(key, w, h);
    g.destroy();

}

function hillLayer(scene){

    const w = 900, h = 300;
    const g = scene.add.graphics();

    g.fillStyle(0x1f3a63, 1);
    g.beginPath();
    g.moveTo(0, h);

    for(let x = 0; x <= w; x += 90){

        g.lineTo(x, h - 60 - Math.abs(Math.sin(x * 0.01)) * 120);

    }

    g.lineTo(w, h);
    g.closePath();
    g.fillPath();

    g.generateTexture("hills-far", w, h);
    g.destroy();

}

function cloudPlatform(scene){

    const w = 220, h = 70;
    const g = scene.add.graphics();

    g.fillStyle(0xffffff, 0.95);
    g.fillEllipse(w * 0.3, h * 0.55, 130, 60);
    g.fillEllipse(w * 0.62, h * 0.42, 150, 66);
    g.fillEllipse(w * 0.85, h * 0.58, 100, 50);
    g.fillStyle(0xe8effc, 0.9);
    g.fillEllipse(w * 0.5, h * 0.7, 200, 40);

    g.generateTexture("platform-cloud", w, h);
    g.destroy();

}

function ledgePlatform(scene){

    const w = 220, h = 46;
    const g = scene.add.graphics();

    g.fillStyle(0x6b4b2a, 1);
    g.fillRoundedRect(0, 10, w, h - 10, 10);
    g.fillStyle(0x3f8f4a, 1);
    g.fillRoundedRect(0, 0, w, 20, 8);
    g.fillStyle(0x2e6e38, 1);
    for(let x = 10; x < w; x += 26){

        g.fillTriangle(x, 12, x + 10, -2, x + 20, 12);

    }

    g.generateTexture("platform-ledge", w, h);
    g.destroy();

}

function groundTile(scene){

    const w = 220, h = 120;
    const g = scene.add.graphics();

    g.fillStyle(0x4a3319, 1);
    g.fillRect(0, 24, w, h - 24);
    g.fillStyle(0x3f8f4a, 1);
    g.fillRect(0, 0, w, 30);
    g.fillStyle(0x2e6e38, 1);
    for(let x = 6; x < w; x += 22){

        g.fillTriangle(x, 16, x + 9, -4, x + 18, 16);

    }

    g.generateTexture("ground", w, h);
    g.destroy();

}

function thornBush(scene){

    const s = 70;
    const g = scene.add.graphics();

    g.fillStyle(0x24501f, 1);
    g.fillCircle(s / 2, s * 0.65, s * 0.38);
    g.lineStyle(4, 0x123010, 1);

    for(let i = 0; i < 8; i++){

        const a = (i / 8) * Math.PI * 2;
        const cx = s / 2 + Math.cos(a) * s * 0.3;
        const cy = s * 0.65 + Math.sin(a) * s * 0.3;

        g.lineBetween(cx, cy, cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);

    }

    g.generateTexture("thorn-bush", s, s);
    g.destroy();

}

function boulder(scene){

    const s = 90;
    const g = scene.add.graphics();

    g.fillStyle(0x6f6f6f, 1);
    g.fillCircle(s / 2, s / 2, s / 2 - 2);
    g.fillStyle(0x585858, 1);
    g.fillCircle(s * 0.38, s * 0.4, s * 0.12);
    g.fillCircle(s * 0.62, s * 0.58, s * 0.09);
    g.lineStyle(3, 0x4a4a4a, 1);
    g.strokeCircle(s / 2, s / 2, s / 2 - 2);

    g.generateTexture("boulder", s, s);
    g.destroy();

}

function fireZone(scene){

    const w = 140, h = 100;
    const g = scene.add.graphics();

    g.fillStyle(0xff7a1a, 0.85);
    g.fillTriangle(w * 0.15, h, w * 0.35, h * 0.15, w * 0.5, h);
    g.fillTriangle(w * 0.4, h, w * 0.6, h * 0.05, w * 0.75, h);
    g.fillTriangle(w * 0.62, h, w * 0.82, h * 0.3, w * 0.95, h);
    g.fillStyle(0xffd23f, 0.9);
    g.fillTriangle(w * 0.25, h, w * 0.37, h * 0.45, w * 0.5, h);
    g.fillTriangle(w * 0.55, h, w * 0.68, h * 0.35, w * 0.82, h);

    g.generateTexture("fire-zone", w, h);
    g.destroy();

}

function banana(scene){

    const s = 44;
    const g = scene.add.graphics();

    g.lineStyle(12, 0xf4d03f, 1);
    g.beginPath();
    g.arc(s * 0.5, s * 0.6, 20, Phaser.Math.DegToRad(150), Phaser.Math.DegToRad(-40), false);
    g.strokePath();
    g.lineStyle(3, 0x8a6d1a, 1);
    g.beginPath();
    g.arc(s * 0.5, s * 0.6, 20, Phaser.Math.DegToRad(150), Phaser.Math.DegToRad(-40), false);
    g.strokePath();

    g.generateTexture("banana", s, s);
    g.destroy();

}

function herb(scene){

    const s = 44;
    const g = scene.add.graphics();

    g.fillStyle(0x37b24d, 1);
    g.fillEllipse(s * 0.5, s * 0.55, s * 0.5, s * 0.8);
    g.lineStyle(2, 0x1f7a30, 1);
    g.lineBetween(s * 0.5, s * 0.2, s * 0.5, s * 0.9);
    g.fillStyle(0x2f9c40, 1);
    g.fillEllipse(s * 0.28, s * 0.35, s * 0.26, s * 0.4);
    g.fillEllipse(s * 0.72, s * 0.35, s * 0.26, s * 0.4);

    g.generateTexture("herb", s, s);
    g.destroy();

}

function coin(scene){

    const s = 36;
    const g = scene.add.graphics();

    g.fillStyle(0xffd23f, 1);
    g.fillCircle(s / 2, s / 2, s / 2 - 2);
    g.lineStyle(3, 0xc98d0e, 1);
    g.strokeCircle(s / 2, s / 2, s / 2 - 2);
    g.fillStyle(0xffe9a8, 1);
    g.fillCircle(s / 2, s / 2, s / 2 - 10);

    g.generateTexture("coin", s, s);
    g.destroy();

}

function lotus(scene){

    const s = 44;
    const g = scene.add.graphics();

    g.fillStyle(0xff6fa5, 1);

    for(let i = 0; i < 6; i++){

        const a = (i / 6) * Math.PI * 2;

        g.fillEllipse(
            s / 2 + Math.cos(a) * 12, s / 2 + Math.sin(a) * 12, 20, 12
        );

    }

    g.fillStyle(0xffd23f, 1);
    g.fillCircle(s / 2, s / 2, 8);

    g.generateTexture("lotus", s, s);
    g.destroy();

}

function finishGate(scene){

    const w = 160, h = 320;
    const g = scene.add.graphics();

    g.fillStyle(0xd9a441, 1);
    g.fillRoundedRect(0, 0, 26, h, 8);
    g.fillRoundedRect(w - 26, 0, 26, h, 8);
    g.fillRoundedRect(0, 0, w, 30, 10);
    g.fillStyle(0xfff3c4, 0.55);
    g.fillRoundedRect(w * 0.5 - 40, 30, 80, h - 30, 20);

    g.generateTexture("finish-gate", w, h);
    g.destroy();

}

function glow(scene){

    const s = 128;
    const g = scene.add.graphics();

    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(s / 2, s / 2, s / 2);

    g.generateTexture("glow", s, s);
    g.destroy();

}
