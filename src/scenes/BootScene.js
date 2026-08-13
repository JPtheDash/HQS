import Phaser from "phaser";
import generatePlaceholderTextures from "../game/PlaceholderArt";

/**
 * Nothing is loaded from disk yet - every texture is drawn at runtime by
 * PlaceholderArt. This scene exists as the one place that happens, so every
 * later scene can assume its textures already exist.
 */
export default class BootScene extends Phaser.Scene {

    constructor(){

        super("Boot");

    }

    create(){

        generatePlaceholderTextures(this);

        this.scene.start("Home");

    }

}
