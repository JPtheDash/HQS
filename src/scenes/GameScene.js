import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y } from "../ui/layout";
import {
    GROUND_SEGMENTS, PLATFORMS, OBSTACLES, COLLECTIBLES,
    BOULDER_PATROL_RANGE, FINISH_X
} from "../data/level1";

//-------------------------
// Movement tuning
//-------------------------

// Hanuman runs by himself - the player never steers left/right, only up.
// This is what carries him forward every frame.
const RUN_SPEED = 260;

const GRAVITY = 1650;
const JUMP_VELOCITY = -740;
const DOUBLE_JUMP_VELOCITY = -660;

// A held tap becomes flight rather than a second jump once it has been down
// this long. Short enough that flight feels like an extension of the jump,
// long enough that an ordinary tap-to-jump never accidentally lifts off.
const FLY_HOLD_DELAY = 140;
const FLY_RISE_SPEED = -360;

// Swiping down past this many px (in screen space, so it works at any zoom)
// while airborne drops Hanuman fast - past storm clouds, or just to land
// sooner than gliding down would.
const SWIPE_DOWN_DISTANCE = 46;
const DIVE_SPEED = 1000;
const DIVE_DURATION = 420;

//-------------------------
// Health & stamina
//-------------------------

const HEALTH_MAX = 100;
const STAMINA_MAX = 100;

const STAMINA_DRAIN_PER_SEC = 30;
const STAMINA_REGEN_PER_SEC = 8;

const DAMAGE_THORN = 18;
const DAMAGE_BOULDER = 25;
const DAMAGE_FIRE = 16;
const DAMAGE_FALL = 28;

// After any hit, Hanuman can't be hit again for this long - without it, one
// touch of a thorn bush drains the whole bar in the handful of frames it
// takes to clear the overlap.
const INVULNERABLE_MS = 900;

const PICKUP_STAMINA = 30;
const PICKUP_HEALTH = 35;
const LOTUS_VALUE = 5;

const BOULDER_SPEED = 90;

export default class GameScene extends Phaser.Scene {

    constructor(){

        super("Game");

    }

    create(){

        this.health = HEALTH_MAX;
        this.stamina = STAMINA_MAX;
        this.coins = 0;
        this.jumpsUsed = 0;
        this.isFlying = false;
        this.isDiving = false;
        this.invulnerable = false;
        this.wasGrounded = true;
        this.gameOver = false;
        this.paused = false;
        this.pointerDown = false;
        this.pointerDownAt = 0;
        this.pointerStartY = 0;
        this.diveArmed = false;

        this.physics.world.setBounds(-100, 0, FINISH_X + 900, GAME_HEIGHT);
        this.physics.world.gravity.y = GRAVITY;

        this.buildBackground();
        this.buildGround();
        this.buildPlatforms();
        this.buildObstacles();
        this.buildCollectibles();
        this.buildFinish();
        this.buildPlayer();
        this.buildHud();
        this.buildPauseOverlay();

        this.cameras.main.setBounds(-100, 0, FINISH_X + 900, GAME_HEIGHT);
        this.cameras.main.startFollow(
            this.player, true, 0.1, 0.1, -GAME_WIDTH * 0.32, 0
        );

        this.physics.add.collider(this.player, this.groundBodies);
        this.physics.add.collider(this.player, this.platformBodies);
        this.physics.add.overlap(
            this.player, this.hazards, this.onHazard, null, this
        );
        this.physics.add.overlap(
            this.player, this.collectibleGroup, this.onCollect, null, this
        );
        this.physics.add.overlap(
            this.player, this.finishGate, () => this.endRun(true), null, this
        );

        this.setupInput();

    }

    //-------------------------
    // World building
    //-------------------------

    buildBackground(){

        const sky = this.add.graphics().setScrollFactor(0).setDepth(-100);

        sky.fillGradientStyle(0x7fc4e8, 0x7fc4e8, 0xffe6ae, 0xffe6ae, 1);
        sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        const worldEnd = FINISH_X + 900;

        for(let x = -200; x < worldEnd; x += 820){

            this.add.image(x, GAME_HEIGHT - 120, "hills-far")
                .setOrigin(0, 1)
                .setScrollFactor(0.3)
                .setDepth(-90)
                .setAlpha(0.9);

        }

        for(let i = 0; i < 22; i++){

            const x = Phaser.Math.Between(-100, worldEnd);
            const y = Phaser.Math.Between(70, 320);

            this.add.image(x, y, "platform-cloud")
                .setOrigin(0.5)
                .setScrollFactor(0.55)
                .setDepth(-80)
                .setAlpha(0.55)
                .setScale(Phaser.Math.FloatBetween(0.5, 1));

        }

    }

    buildGround(){

        this.groundBodies = this.physics.add.staticGroup();

        const tileW = 220;

        for(const seg of GROUND_SEGMENTS){

            for(let x = seg.startX; x < seg.endX; x += tileW){

                const w = Math.min(tileW, seg.endX - x);
                const tile = this.groundBodies.create(x, GROUND_Y, "ground")
                    .setOrigin(0, 0);

                if(w !== tileW){

                    tile.setDisplaySize(w, tile.height);
                    tile.refreshBody();

                }

            }

        }

    }

    buildPlatforms(){

        this.platformBodies = this.physics.add.staticGroup();

        for(const p of PLATFORMS){

            this.platformBodies.create(p.x, p.y, p.texture);

        }

    }

    buildObstacles(){

        this.hazards = this.physics.add.group();

        const textureFor = { thorn: "thorn-bush", fire: "fire-zone", boulder: "boulder" };

        for(const o of OBSTACLES){

            const spr = this.hazards.create(o.x, o.y, textureFor[o.kind]);

            spr.setData("kind", o.kind);
            spr.body.setAllowGravity(false);
            spr.body.setImmovable(true);

            if(o.kind === "boulder"){

                spr.setData("baseX", o.x);
                spr.body.setVelocityX(BOULDER_SPEED);

            }

        }

    }

    buildCollectibles(){

        this.collectibleGroup = this.physics.add.staticGroup();

        const textureFor = { banana: "banana", herb: "herb", coin: "coin", lotus: "lotus" };

        for(const c of COLLECTIBLES){

            const item = this.collectibleGroup.create(c.x, c.y, textureFor[c.kind]);

            item.setData("kind", c.kind);

            this.tweens.add({
                targets: item,
                y: c.y - 12,
                duration: Phaser.Math.Between(750, 1050),
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });

        }

    }

    buildFinish(){

        const y = GROUND_Y - 160;

        this.add.image(FINISH_X, y, "glow")
            .setScale(2.6)
            .setAlpha(0.35)
            .setDepth(-10);

        this.add.image(FINISH_X, y, "finish-gate");

        this.add.text(FINISH_X, y - 190, "TO THE RIVER YAMUNA →", {
            fontFamily: "Georgia, serif",
            fontSize: "26px",
            color: "#fff3c4"
        }).setOrigin(0.5);

        this.finishGate = this.physics.add.staticGroup();
        this.finishGate.create(FINISH_X, y, "finish-gate").setAlpha(0.001);

    }

    buildPlayer(){

        this.player = this.physics.add.sprite(0, GROUND_Y - 200, "hanuman");

        this.player.setCollideWorldBounds(false);
        this.player.setDepth(10);
        this.player.setDragX(0);

    }

    //-------------------------
    // HUD
    //-------------------------

    buildHud(){

        const barW = 220, barH = 20;
        const barX = 30, healthY = 30, staminaY = healthY + 30;

        this.hudFrameGfx = this.add.graphics().setScrollFactor(0).setDepth(1000);
        this.hudFrameGfx.fillStyle(0x000000, 0.4);
        this.hudFrameGfx.fillRoundedRect(barX - 4, healthY - 4, barW + 8, barH + 8, 8);
        this.hudFrameGfx.fillRoundedRect(barX - 4, staminaY - 4, barW + 8, barH + 8, 8);

        this.healthFillGfx = this.add.graphics().setScrollFactor(0).setDepth(1001);
        this.staminaFillGfx = this.add.graphics().setScrollFactor(0).setDepth(1001);

        this.add.text(barX, healthY - 24, "HEALTH", {
            fontFamily: "Georgia, serif", fontSize: "16px", color: "#ffe9b0"
        }).setScrollFactor(0).setDepth(1001);

        this.add.text(barX, staminaY - 24, "STAMINA", {
            fontFamily: "Georgia, serif", fontSize: "16px", color: "#ffe9b0"
        }).setScrollFactor(0).setDepth(1001);

        this.hudBars = { barX, barW, barH, healthY, staminaY };

        this.coinIcon = this.add.image(GAME_WIDTH - 130, 40, "coin")
            .setScrollFactor(0).setDepth(1001).setScale(1.1);

        this.coinText = this.add.text(GAME_WIDTH - 105, 26, "0", {
            fontFamily: "Georgia, serif", fontSize: "28px", color: "#fff3c4", fontStyle: "bold"
        }).setScrollFactor(0).setDepth(1001);

        this.pauseButton = this.add.text(GAME_WIDTH - 46, 34, "❙❙", {
            fontFamily: "Georgia, serif", fontSize: "28px", color: "#fff3c4"
        })
            .setScrollFactor(0).setDepth(1001)
            .setInteractive({ useHandCursor: true });

        this.pauseButton.on("pointerdown", () => this.togglePause());

        this.updateHud();

    }

    drawBar(gfx, x, y, w, h, ratio, color){

        gfx.clear();
        gfx.fillStyle(0x1a1a1a, 0.6);
        gfx.fillRoundedRect(x, y, w, h, 6);
        gfx.fillStyle(color, 1);
        gfx.fillRoundedRect(x, y, Math.max(0, w * Phaser.Math.Clamp(ratio, 0, 1)), h, 6);

    }

    updateHud(){

        const { barX, barW, barH, healthY, staminaY } = this.hudBars;

        this.drawBar(
            this.healthFillGfx, barX, healthY, barW, barH,
            this.health / HEALTH_MAX, 0xdd3344
        );

        this.drawBar(
            this.staminaFillGfx, barX, staminaY, barW, barH,
            this.stamina / STAMINA_MAX, 0x4fb8e8
        );

        this.coinText.setText(String(this.coins));

    }

    buildPauseOverlay(){

        this.pauseOverlay = this.add.container(0, 0)
            .setScrollFactor(0).setDepth(2000).setVisible(false);

        const veil = this.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6
        );

        const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, "PAUSED", {
            fontFamily: "Georgia, serif", fontSize: "48px", color: "#fff3c4"
        }).setOrigin(0.5);

        const resume = this.makeOverlayButton(
            GAME_WIDTH / 2, GAME_HEIGHT / 2, "RESUME", () => this.togglePause()
        );

        const home = this.makeOverlayButton(
            GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110, "HOME", () => this.scene.start("Home")
        );

        this.pauseOverlay.add([veil, title, resume, home]);

    }

    makeOverlayButton(x, y, label, onTap){

        const w = 300, h = 84;
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

    togglePause(){

        this.paused = !this.paused;

        if(this.paused){

            this.physics.world.pause();

        } else {

            this.physics.world.resume();

        }

        this.pauseOverlay.setVisible(this.paused);

    }

    popText(x, y, label, color){

        const t = this.add.text(x, y, label, {
            fontFamily: "Georgia, serif", fontSize: "22px", color, fontStyle: "bold"
        }).setOrigin(0.5).setDepth(1002);

        this.tweens.add({
            targets: t, y: y - 46, alpha: 0, duration: 750,
            onComplete: () => t.destroy()
        });

    }

    //-------------------------
    // Input
    //-------------------------

    setupInput(){

        this.input.on("pointerdown", pointer => {

            if(this.paused || this.gameOver){

                return;

            }

            this.pointerDown = true;
            this.pointerDownAt = this.time.now;
            this.pointerStartY = pointer.y;
            this.diveArmed = true;

            this.tryJump();

        });

        this.input.on("pointermove", pointer => {

            if(!this.pointerDown || !this.diveArmed || this.paused || this.gameOver){

                return;

            }

            if(this.wasGrounded){

                return;

            }

            if(pointer.y - this.pointerStartY > SWIPE_DOWN_DISTANCE){

                this.startDive();
                this.diveArmed = false;

            }

        });

        this.input.on("pointerup", () => {

            this.pointerDown = false;
            this.isFlying = false;

        });

    }

    tryJump(){

        if(this.isDiving){

            return;

        }

        if(this.wasGrounded){

            this.player.setVelocityY(JUMP_VELOCITY);
            this.jumpsUsed = 1;

        } else if(this.jumpsUsed < 2 && !this.isFlying){

            this.player.setVelocityY(DOUBLE_JUMP_VELOCITY);
            this.jumpsUsed = 2;
            this.popText(this.player.x, this.player.y - 60, "!", "#fff3c4");

        }

    }

    startDive(){

        this.isFlying = false;
        this.isDiving = true;
        this.player.setVelocityY(DIVE_SPEED);

        this.time.delayedCall(DIVE_DURATION, () => {

            this.isDiving = false;

        });

    }

    //-------------------------
    // Per-frame update
    //-------------------------

    update(time, delta){

        if(this.gameOver || this.paused){

            return;

        }

        const dt = delta / 1000;

        this.player.setVelocityX(RUN_SPEED);

        const grounded = this.player.body.blocked.down || this.player.body.touching.down;

        if(grounded && !this.wasGrounded){

            this.tweens.add({
                targets: this.player, scaleY: 0.82, duration: 90, yoyo: true
            });

        }

        if(grounded){

            this.jumpsUsed = 0;
            this.isDiving = false;

        }

        this.wasGrounded = grounded;

        // Flight: only kicks in once the hold has lasted past the tap
        // threshold, so a plain tap-to-jump never accidentally lifts off.
        const holdDuration = this.time.now - this.pointerDownAt;

        if(this.pointerDown && !grounded && !this.isDiving &&
           holdDuration > FLY_HOLD_DELAY && this.stamina > 0){

            this.isFlying = true;

        }

        if(this.isFlying){

            if(this.stamina <= 0){

                this.isFlying = false;

            } else {

                this.player.setVelocityY(FLY_RISE_SPEED);
                this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN_PER_SEC * dt);

            }

        } else if(grounded){

            this.stamina = Math.min(STAMINA_MAX, this.stamina + STAMINA_REGEN_PER_SEC * dt);

        }

        // Ceiling: nothing above the HUD to fly into, so just stop him there
        if(this.player.y < 90 && this.player.body.velocity.y < 0){

            this.player.y = 90;
            this.player.setVelocityY(0);

        }

        if(this.player.y > GAME_HEIGHT + 140){

            this.handleFall();

        }

        this.updateBoulders(delta);
        this.updateHud();

    }

    updateBoulders(delta){

        this.hazards.children.each(spr => {

            if(spr.getData("kind") !== "boulder"){

                return;

            }

            const base = spr.getData("baseX");

            if(spr.x <= base - BOULDER_PATROL_RANGE){

                spr.body.setVelocityX(BOULDER_SPEED);

            } else if(spr.x >= base + BOULDER_PATROL_RANGE){

                spr.body.setVelocityX(-BOULDER_SPEED);

            }

        });

    }

    //-------------------------
    // Damage / pickups / end state
    //-------------------------

    onHazard(player, hazard){

        if(this.invulnerable || this.gameOver){

            return;

        }

        const kind = hazard.getData("kind");
        const amount = kind === "thorn" ? DAMAGE_THORN
            : kind === "boulder" ? DAMAGE_BOULDER
            : DAMAGE_FIRE;

        this.damage(amount);

    }

    damage(amount){

        this.health = Math.max(0, this.health - amount);
        this.invulnerable = true;

        this.player.setTint(0xff8080);
        this.cameras.main.shake(140, 0.006);

        this.time.delayedCall(INVULNERABLE_MS, () => {

            this.invulnerable = false;
            this.player.clearTint();

        });

        if(this.health <= 0){

            this.endRun(false);

        }

    }

    handleFall(){

        if(this.gameOver){

            return;

        }

        this.damage(DAMAGE_FALL);

        if(this.gameOver){

            return;

        }

        let respawnSeg = GROUND_SEGMENTS[0];

        for(const seg of GROUND_SEGMENTS){

            if(seg.startX <= this.player.x){

                respawnSeg = seg;

            }

        }

        const respawnX = Phaser.Math.Clamp(
            this.player.x - 150, respawnSeg.startX + 60, respawnSeg.endX - 100
        );

        this.player.setPosition(respawnX, GROUND_Y - 100);
        this.player.setVelocity(0, 0);

    }

    onCollect(player, item){

        const kind = item.getData("kind");

        if(kind === "banana"){

            this.stamina = Math.min(STAMINA_MAX, this.stamina + PICKUP_STAMINA);
            this.popText(item.x, item.y, "+STAMINA", "#8fd3ff");

        } else if(kind === "herb"){

            this.health = Math.min(HEALTH_MAX, this.health + PICKUP_HEALTH);
            this.popText(item.x, item.y, "+HEALTH", "#7CFC93");

        } else if(kind === "lotus"){

            this.coins += LOTUS_VALUE;
            this.popText(item.x, item.y, `+${LOTUS_VALUE}`, "#ffd23f");

        } else {

            this.coins += 1;

        }

        item.destroy();

    }

    endRun(success){

        if(this.gameOver){

            return;

        }

        this.gameOver = true;
        this.physics.world.pause();

        this.time.delayedCall(500, () => {

            this.scene.start("LevelComplete", {
                success,
                coins: this.coins,
                health: this.health
            });

        });

    }

}
