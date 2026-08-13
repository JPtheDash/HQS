import { GROUND_Y } from "../ui/layout";

// Chapter 1: Ashoka Vatika to the edge of the forest. Hand-authored rather
// than generated, so the pacing of "here's a new mechanic, here's a safe
// stretch to practise it" can be tuned by eye. Later chapters can generate
// their layouts once this shape has proven itself fun.
//
// Every x is a position in the scrolling world, not on screen - the camera
// follows Hanuman rather than the level moving under a fixed camera.

export const LEVEL_LENGTH = 5600;

// Continuous ground, with gaps left open on purpose - a gap is a jump the
// player is meant to take. {endX: null} runs to LEVEL_LENGTH.
export const GROUND_SEGMENTS = [
    { startX: -200, endX: 900 },
    { startX: 1040, endX: 1500 },
    { startX: 1680, endX: 2450 },
    // Long gap here - the cloud-hopping stretch below is the only way across
    { startX: 3050, endX: 3400 },
    { startX: 3400, endX: 4550 },
    { startX: 4750, endX: LEVEL_LENGTH + 400 }
];

// Floating ledges and clouds. All static for this slice - see GameScene's
// header comment on why moving platforms waited for a second pass.
export const PLATFORMS = [
    { x: 1580, y: GROUND_Y - 210, texture: "platform-ledge" },

    // The gap at 2450-3050 needs a jump, a fly, and a landing in sequence -
    // first taste of stamina management.
    { x: 2620, y: GROUND_Y - 160, texture: "platform-cloud" },
    { x: 2870, y: GROUND_Y - 260, texture: "platform-cloud" },

    { x: 4650, y: GROUND_Y - 190, texture: "platform-ledge" }
];

export const OBSTACLES = [
    { kind: "thorn", x: 1180, y: GROUND_Y - 35 },
    { kind: "thorn", x: 1830, y: GROUND_Y - 35 },

    // Patrols back and forth across the ledge - see BOULDER_PATROL_RANGE in
    // GameScene. Placed where the ledge is wide enough to still get past it.
    { kind: "boulder", x: 2050, y: GROUND_Y - 45 },

    { kind: "fire", x: 3850, y: GROUND_Y - 50 },
    { kind: "thorn", x: 4300, y: GROUND_Y - 35 }
];

export const COLLECTIBLES = [
    { kind: "coin", x: 500, y: GROUND_Y - 120 },
    { kind: "coin", x: 560, y: GROUND_Y - 160 },
    { kind: "coin", x: 620, y: GROUND_Y - 120 },

    // Banana ahead of the long flight stretch, so a player who reads the
    // level gets there topped up rather than empty.
    { kind: "banana", x: 2350, y: GROUND_Y - 90 },
    { kind: "banana", x: 2700, y: GROUND_Y - 300 },
    { kind: "lotus", x: 2870, y: GROUND_Y - 400 },

    // Herb just past the thorn/boulder run, for whatever health it cost
    { kind: "herb", x: 2200, y: GROUND_Y - 90 },
    { kind: "herb", x: 4450, y: GROUND_Y - 90 },

    { kind: "coin", x: 3550, y: GROUND_Y - 100 },
    { kind: "coin", x: 3650, y: GROUND_Y - 140 },
    { kind: "coin", x: 3750, y: GROUND_Y - 100 },

    { kind: "banana", x: 3950, y: GROUND_Y - 280 },
    { kind: "lotus", x: 5000, y: GROUND_Y - 150 }
];

// How far the boulder at OBSTACLES' "boulder" entry patrols each side of its
// starting x. Kept with the level rather than hardcoded in GameScene so a
// future level can widen or narrow it per-boulder.
export const BOULDER_PATROL_RANGE = 140;

export const FINISH_X = LEVEL_LENGTH;
