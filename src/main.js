import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./ui/layout";
import BootScene from "./scenes/BootScene";
import HomeScene from "./scenes/HomeScene";
import CinematicScene from "./scenes/CinematicScene";
import GameScene from "./scenes/GameScene";
import LevelCompleteScene from "./scenes/LevelCompleteScene";

// Headless Chromium falls back to software WebGL and crawls at a few fps,
// which makes automated playtesting useless. ?renderer=canvas lets tooling
// ask for the canvas renderer instead; normal players never hit this.
const forceCanvas =
    typeof window !== "undefined" &&
    window.location.search.includes("renderer=canvas");

const config = {

    type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,

    // The height comes from the phone - see canvasHeight() in ui/layout.js -
    // so FIT has nothing left to letterbox.
    width: GAME_WIDTH,
    height: GAME_HEIGHT,

    parent: "game-container",

    backgroundColor: "#1a2a4a",

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },

    scene: [

        BootScene,
        HomeScene,
        CinematicScene,
        GameScene,
        LevelCompleteScene

    ]

};

const game = new Phaser.Game(config);

// Handle for tools to drive scenes directly, mirroring the sibling project.
window.__game = game;
