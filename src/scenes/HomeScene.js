import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../ui/layout";

const TITLE_GOLD = "#f2b33d";

export default class HomeScene extends Phaser.Scene {

    constructor(){

        super("Home");

    }

    /** Dusk-over-the-Himalayas gradient, drawn straight to the scene rather
     *  than a texture - it only ever fills the one screen it's drawn on. */
    background(){

        const g = this.add.graphics();

        g.fillGradientStyle(0x0c1c3a, 0x0c1c3a, 0x3a2c63, 0x7a4a6b, 1);
        g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        this.add.image(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.62, "hills-far")
            .setDisplaySize(GAME_WIDTH * 1.4, GAME_HEIGHT * 0.4)
            .setAlpha(0.8);

        // A few drifting clouds so the title screen isn't a flat gradient
        for(let i = 0; i < 4; i++){

            this.add.image(
                Phaser.Math.Between(80, GAME_WIDTH - 80),
                Phaser.Math.Between(120, 340),
                "platform-cloud"
            )
                .setAlpha(0.5)
                .setScale(Phaser.Math.FloatBetween(0.5, 0.9));

        }

    }

    create(){

        this.background();

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.28, "HANUMAN", {
            fontFamily: "Georgia, serif",
            fontSize: "88px",
            color: TITLE_GOLD,
            fontStyle: "bold",
            stroke: "#3a1d05",
            strokeThickness: 8
        }).setOrigin(0.5);

        this.add.text(
            GAME_WIDTH / 2, GAME_HEIGHT * 0.28 + 70, "QUEST FOR SANJEEVINI",
            {
                fontFamily: "Georgia, serif",
                fontSize: "30px",
                color: "#ffe9b0",
                letterSpacing: 4
            }
        ).setOrigin(0.5);

        const hero = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.55, "hanuman")
            .setScale(2.2);

        this.tweens.add({
            targets: hero,
            y: hero.y - 18,
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.buildButton(
            GAME_WIDTH / 2, GAME_HEIGHT - 190, "BEGIN THE QUEST",
            () => this.scene.start("Cinematic")
        );

        const skip = this.add.text(
            GAME_WIDTH / 2, GAME_HEIGHT - 110, "skip story ›",
            { fontFamily: "Georgia, serif", fontSize: "24px", color: "#c9b98f" }
        ).setOrigin(0.5).setInteractive({ useHandCursor: true });

        skip.on("pointerdown", () => this.scene.start("Game"));

    }

    buildButton(x, y, label, onTap){

        const w = 420, h = 96;

        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0xb1273a, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
        bg.lineStyle(4, 0xf2b33d, 1);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 24);

        const text = this.add.text(0, 0, label, {
            fontFamily: "Georgia, serif",
            fontSize: "34px",
            color: "#fff3c4",
            fontStyle: "bold"
        }).setOrigin(0.5);

        btn.add([bg, text]);
        btn.setSize(w, h);
        btn.setInteractive({ useHandCursor: true });

        btn.on("pointerdown", onTap);

        this.tweens.add({
            targets: btn,
            scale: 1.05,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        return btn;

    }

}
