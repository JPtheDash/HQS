import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../ui/layout";

// The opening cutscene, told in silhouette rather than illustration - there
// is no cinematic art yet, so every slide is built from the same "warrior"
// and "hanuman" placeholder textures, recoloured and posed per beat. Swap
// the build() functions for real key-frame art later; RUNNING the story
// beats in order is the thing worth having early.

const RAKSHASA_TINT = 0x8a1f2b;
const VANARA_TINT = 0x3f8f4a;
const RAMA_TINT = 0x3f6fd6;
const LAKSHMANA_TINT = 0x4fa8c9;

const SLIDE_MS = 3400;

function addFigure(layer, scene, x, y, tint, scale = 1.4){

    const f = scene.add.image(x, y, "warrior").setTint(tint).setScale(scale);

    layer.add(f);

    return f;

}

const SLIDES = [

    {
        caption: "The battlefield of Lanka.\nRavana's demon army storms the Vanara ranks.",
        build(scene, layer){

            const bg = scene.add.graphics();

            bg.fillGradientStyle(0x2a0a12, 0x2a0a12, 0x5c1a24, 0x5c1a24, 1);
            bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            layer.add(bg);

            for(let i = 0; i < 6; i++){

                addFigure(
                    layer, scene,
                    Phaser.Math.Between(120, GAME_WIDTH - 120),
                    Phaser.Math.Between(GAME_HEIGHT * 0.55, GAME_HEIGHT * 0.8),
                    i % 2 === 0 ? RAKSHASA_TINT : VANARA_TINT,
                    Phaser.Math.FloatBetween(1.1, 1.6)
                );

            }

        }
    },

    {
        caption: "Indrajit's divine weapon finds its mark.\nLakshmana falls.",
        build(scene, layer){

            const bg = scene.add.graphics();

            bg.fillGradientStyle(0x1a0a12, 0x1a0a12, 0x40121c, 0x40121c, 1);
            bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            layer.add(bg);

            const flash = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.45, "glow")
                .setTint(0xff5555).setAlpha(0.7).setScale(3);

            layer.add(flash);

            scene.tweens.add({
                targets: flash, alpha: 0.15, scale: 4.2, duration: 900,
                yoyo: true, repeat: -1
            });

            const lakshmana = addFigure(
                layer, scene, GAME_WIDTH / 2, GAME_HEIGHT * 0.72, LAKSHMANA_TINT, 1.8
            );

            lakshmana.setRotation(Phaser.Math.DegToRad(90));

        }
    },

    {
        caption: "Rama and the Vanara army are stricken with grief.",
        build(scene, layer){

            const bg = scene.add.graphics();

            bg.fillGradientStyle(0x0c1c3a, 0x0c1c3a, 0x2c2440, 0x2c2440, 1);
            bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            layer.add(bg);

            const lakshmana = addFigure(
                layer, scene, GAME_WIDTH / 2, GAME_HEIGHT * 0.74, LAKSHMANA_TINT, 1.8
            );

            lakshmana.setRotation(Phaser.Math.DegToRad(90));

            addFigure(layer, scene, GAME_WIDTH / 2 - 90, GAME_HEIGHT * 0.55, RAMA_TINT, 1.6);

            for(let i = 0; i < 4; i++){

                addFigure(
                    layer, scene,
                    GAME_WIDTH / 2 + 60 + i * 55, GAME_HEIGHT * 0.58,
                    VANARA_TINT, 1.2
                );

            }

        }
    },

    {
        caption: "Only the sacred Sanjeevini herb, on Mount Dronagiri,\ncan save him before sunrise.",
        build(scene, layer){

            const bg = scene.add.graphics();

            bg.fillGradientStyle(0x0c1c3a, 0x0c1c3a, 0x3a2c63, 0x3a2c63, 1);
            bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            layer.add(bg);

            const mountain = scene.add.graphics();

            mountain.fillStyle(0x263a63, 1);
            mountain.fillTriangle(
                GAME_WIDTH * 0.2, GAME_HEIGHT * 0.7,
                GAME_WIDTH * 0.5, GAME_HEIGHT * 0.28,
                GAME_WIDTH * 0.8, GAME_HEIGHT * 0.7
            );
            mountain.fillStyle(0xffffff, 0.9);
            mountain.fillTriangle(
                GAME_WIDTH * 0.44, GAME_HEIGHT * 0.36,
                GAME_WIDTH * 0.5, GAME_HEIGHT * 0.28,
                GAME_WIDTH * 0.56, GAME_HEIGHT * 0.36
            );
            layer.add(mountain);

            const glow = scene.add.image(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.32, "glow")
                .setTint(0x9fffb0).setAlpha(0.7).setScale(1.4);

            layer.add(glow);

            scene.tweens.add({
                targets: glow, alpha: 0.3, scale: 1.9, duration: 1100,
                yoyo: true, repeat: -1
            });

        }
    },

    {
        caption: "Hanuman bows before Rama and accepts the quest.",
        build(scene, layer){

            const bg = scene.add.graphics();

            bg.fillGradientStyle(0x0c1c3a, 0x0c1c3a, 0x3a2c63, 0x3a2c63, 1);
            bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            layer.add(bg);

            addFigure(layer, scene, GAME_WIDTH / 2 + 70, GAME_HEIGHT * 0.58, RAMA_TINT, 1.8);

            const hanuman = scene.add.image(
                GAME_WIDTH / 2 - 90, GAME_HEIGHT * 0.64, "hanuman"
            ).setScale(1.5).setRotation(Phaser.Math.DegToRad(18));

            layer.add(hanuman);

        }
    },

    {
        caption: "With a mighty leap, Hanuman soars into the sky\ntoward the Himalayas.",
        isLast: true,
        build(scene, layer){

            const bg = scene.add.graphics();

            bg.fillGradientStyle(0x1a2a4a, 0x1a2a4a, 0xffe6ae, 0xffe6ae, 1);
            bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            layer.add(bg);

            const hanuman = scene.add.image(
                GAME_WIDTH / 2, GAME_HEIGHT * 0.78, "hanuman"
            ).setScale(1.8);

            layer.add(hanuman);

            for(let i = 0; i < 5; i++){

                const streak = scene.add.rectangle(
                    GAME_WIDTH / 2 + Phaser.Math.Between(-60, 60),
                    GAME_HEIGHT * 0.78 + 40 + i * 14,
                    6, 46, 0xffffff, 0.6
                );

                layer.add(streak);

            }

            scene.tweens.add({
                targets: hanuman,
                y: -140,
                scale: 0.6,
                duration: SLIDE_MS - 200,
                ease: "Cubic.easeIn"
            });

        }
    }

];

export default class CinematicScene extends Phaser.Scene {

    constructor(){

        super("Cinematic");

    }

    create(){

        this.index = -1;
        this.leaving = false;
        this.layer = this.add.container(0, 0);

        this.captionText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 150, "", {
            fontFamily: "Georgia, serif",
            fontSize: "27px",
            color: "#fff3c4",
            align: "center",
            wordWrap: { width: GAME_WIDTH - 120 }
        }).setOrigin(0.5).setDepth(50);

        this.tapHint = this.add.text(
            GAME_WIDTH / 2, GAME_HEIGHT - 60, "tap to continue", {
                fontFamily: "Georgia, serif", fontSize: "18px", color: "#c9b98f"
            }
        ).setOrigin(0.5).setDepth(50);

        this.tweens.add({
            targets: this.tapHint, alpha: 0.25, duration: 900, yoyo: true, repeat: -1
        });

        // A full-screen catcher, below the skip button in depth, so a tap
        // anywhere advances the slide - except on the button itself, which
        // Phaser's topOnly input hit-testing already resolves in the
        // button's favour without this having to know the button exists.
        this.tapCatcher = this.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.001
        ).setDepth(40).setInteractive();

        this.tapCatcher.on("pointerdown", () => {

            if(this.leaving){

                return;

            }

            this.clearTimer();
            this.advance();

        });

        this.skipButton = this.add.text(GAME_WIDTH - 30, 30, "SKIP ›", {
            fontFamily: "Georgia, serif", fontSize: "22px", color: "#ffe9b0"
        }).setOrigin(1, 0).setDepth(60).setInteractive({ useHandCursor: true });

        this.skipButton.on("pointerdown", () => this.goToGame());

        this.advance();

    }

    clearTimer(){

        if(this.slideTimer){

            this.slideTimer.remove(false);
            this.slideTimer = null;

        }

    }

    advance(){

        if(this.leaving){

            return;

        }

        this.index++;

        if(this.index >= SLIDES.length){

            this.goToGame();
            return;

        }

        this.showSlide(SLIDES[this.index]);

    }

    showSlide(slide){

        this.tweens.add({
            targets: this.layer,
            alpha: 0,
            duration: 300,
            onComplete: () => {

                if(this.leaving){

                    return;

                }

                this.layer.removeAll(true);
                slide.build(this, this.layer);
                this.layer.alpha = 0;

                this.tweens.add({ targets: this.layer, alpha: 1, duration: 350 });

                this.captionText.setText(slide.caption);
                this.children.bringToTop(this.captionText);
                this.children.bringToTop(this.tapHint);
                this.children.bringToTop(this.skipButton);

                this.clearTimer();
                this.slideTimer = this.time.delayedCall(SLIDE_MS, () => this.advance());

            }
        });

    }

    goToGame(){

        if(this.leaving){

            return;

        }

        this.leaving = true;
        this.clearTimer();

        this.cameras.main.flash(500, 255, 240, 200);

        this.time.delayedCall(500, () => {

            this.scene.start("Game");

        });

    }

}
