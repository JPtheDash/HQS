import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../ui/layout";

export default class LevelCompleteScene extends Phaser.Scene {

    constructor(){

        super("LevelComplete");

    }

    init(data){

        this.success = !!data.success;
        this.coins = data.coins || 0;
        this.health = data.health || 0;

    }

    create(){

        const g = this.add.graphics();

        g.fillGradientStyle(0x0c1c3a, 0x0c1c3a, 0x3a2c63, 0x7a4a6b, 1);
        g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        const headline = this.success
            ? "CHAPTER COMPLETE"
            : "HANUMAN NEEDS REST";

        const subline = this.success
            ? "The forest gives way to the River Yamuna.\nThe journey to Dronagiri continues..."
            : "The path is hard, but Rama is waiting.\nTry the forest again.";

        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, "hanuman")
            .setScale(2.4)
            .setTint(this.success ? 0xffffff : 0xffb0b0);

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.5, headline, {
            fontFamily: "Georgia, serif",
            fontSize: "46px",
            color: "#ffe9b0",
            fontStyle: "bold",
            align: "center"
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.5 + 60, subline, {
            fontFamily: "Georgia, serif",
            fontSize: "24px",
            color: "#e8dcc0",
            align: "center"
        }).setOrigin(0.5);

        this.add.image(GAME_WIDTH / 2 - 60, GAME_HEIGHT * 0.65, "coin").setScale(1.3);
        this.add.text(GAME_WIDTH / 2 - 20, GAME_HEIGHT * 0.65 - 16, `x ${this.coins}`, {
            fontFamily: "Georgia, serif", fontSize: "30px", color: "#fff3c4"
        });

        this.buildButton(
            GAME_WIDTH / 2, GAME_HEIGHT * 0.8, "PLAY AGAIN",
            () => this.scene.start("Game")
        );

        this.buildButton(
            GAME_WIDTH / 2, GAME_HEIGHT * 0.8 + 100, "HOME",
            () => this.scene.start("Home")
        );

    }

    buildButton(x, y, label, onTap){

        const w = 320, h = 78;
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0xb1273a, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
        bg.lineStyle(3, 0xf2b33d, 1);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);

        const text = this.add.text(0, 0, label, {
            fontFamily: "Georgia, serif", fontSize: "28px", color: "#fff3c4", fontStyle: "bold"
        }).setOrigin(0.5);

        btn.add([bg, text]);
        btn.setSize(w, h);
        btn.setInteractive({ useHandCursor: true });
        btn.on("pointerdown", onTap);

        return btn;

    }

}
