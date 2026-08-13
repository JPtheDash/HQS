// Design sizes, in on-screen px. Everything in the game is sized against
// these rather than against raw device pixels, so a layout keeps meaning
// what it meant on every phone.

export const GAME_WIDTH = 720;

// The floor rather than the canvas: nothing is laid out in less room than
// this, but a phone with more room gets it. See canvasHeight() below.
export const DESIGN_HEIGHT = 1280;

/**
 * The canvas is as tall as the phone, not a fixed 9:16 - see the sibling
 * Krishna project's ui/layout.js, which this mirrors. At a fixed 720x1280
 * with Scale.FIT, a modern 20:9 phone letterboxes a fifth of the screen in
 * black; matching the device's own aspect leaves nothing to letterbox.
 * Width stays fixed so every size in the game keeps its meaning; only the
 * height moves, and scenes anchor to it rather than to 1280.
 */
function canvasHeight(){

    if(typeof window === "undefined"){

        return DESIGN_HEIGHT;

    }

    const aspect = window.innerHeight / window.innerWidth;

    return Math.round(
        Math.min(Math.max(GAME_WIDTH * aspect, DESIGN_HEIGHT), 1900)
    );

}

export const GAME_HEIGHT = canvasHeight();

// Hanuman runs left to right rather than climbing, so the world is wide
// rather than tall. GROUND_Y is where the running surface sits by default;
// individual ledges, clouds and cliffs float above or below it.
export const GROUND_Y = GAME_HEIGHT - 160;

/**
 * Scale an image to cover the whole canvas, cropping the overflow, rather
 * than stretching it to whatever shape the phone happens to be.
 */
export function coverScreen(image){

    const scale = Math.max(
        GAME_WIDTH / image.width, GAME_HEIGHT / image.height
    );

    image.setScale(scale).setPosition(GAME_WIDTH/2, GAME_HEIGHT/2);

    return image;

}
