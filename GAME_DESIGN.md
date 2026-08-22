# Hanuman: Quest for Sanjeevini — Game Design

A story-driven 2D adventure (Phaser 3 + Vite), portrait orientation (720×1280),
built for Android mobile. **35 scenes total** across the chapters below.

## Chapter / gameplay map

| Chapter | Story beat | Gameplay |
|---|---|---|
| **Prologue** | Lakshmana injured | Cinematic |
| 1. The Journey Begins | Hanuman takes oath | Forest platforming |
| 2. Through the Forest | Hanuman gets tired | Fruits + hazards |
| 3. Into the Sky | Hanuman reaches the mountains | Flying |
| 4. The Storm | Nature challenges him | Flying + survival |
| 5. The River | New obstacle | River platforming |
| 6. Guardian of the River | First major enemy | Boss |
| 7. Himalayan Path | Dronagiri appears | Mountain climbing |
| 8. Sanjeevini | Herb cannot be identified | Exploration |
| 9. The Mountain | Hanuman lifts Dronagiri | Cinematic |
| 10. Return Before Dawn | Race against time | Flying |
| **Finale** | Lakshmana revived | Cinematic + victory |

## Prologue cinematic beats (Scenes 1–5, delivered so far)

1. **Main Menu** — Hanuman on a cliff at sunrise; PLAY / Settings / Sound / Story.
2. **Battle of Lanka** — nighttime battlefield; camera pans wide → Rama → Lakshmana → Hanuman.
   - "The battle of Lanka had reached its final and fiercest hour."
   - "But darkness had one final weapon."
3. **Lakshmana Falls** — a flash of attack, slow motion, Lakshmana falls, Rama rushes, Hanuman shocked.
   - "Lakshmana had fallen." … "His life was fading."
4. **Rama's Despair** — quiet battlefield, Rama beside Lakshmana.
   - "Only the Sanjeevini herb could save Lakshmana." … "But the herb grew far away, upon the sacred mountain of Dronagiri."
5. **Hanuman Accepts the Mission** — kneels before Rama; Rama's hand on his shoulder; heroic music.
   - "Leave it to me." … "I will bring the Sanjeevini before sunrise."

## Scene 6 — Hanuman Powers Up (delivered)
Golden energy aura, swirling motes, camera rises; then MISSION panel
(Reach Dronagiri / Find Sanjeevini / Return before sunrise) → TAP TO JUMP → gameplay.

## Chapter 1 gameplay (Scenes 7–10, delivered; not yet built)
- **Scene 7 — Ashoka Vatika (tutorial):** ground tiles, ledge platforms, thorn
  bushes, bananas, coins, hills bg. Teach Move → Jump → Collect, one mechanic at
  a time (gap → thorn → low platform → banana). HUD: ❤️ health (top-left),
  ENERGY (top-center), ⏱ time (top-right).
- **Scene 8 — Tree jumping:** branches as platforms, some moving; introduce
  **Double Jump** ("Tap again in the air!") then remove the tip.
- **Scene 9 — First danger:** hazards one at a time — thorns → rolling boulders →
  fire zones; forest darkens, music tenses.
- **Scene 10 — Hanuman gets tired:** energy bar drains (🟩🟩🟩🟨🟥), movement
  slows, "Hanuman is tired." → "Find food to restore energy." Food restores energy.

## Asset & audio conventions
- **Music:** `hanumanstory.mp3` on menu/cinematic/story screens; `game.mp3` during gameplay.
- **Player animation:** `spritesheet.png` for Hanuman during gameplay.
- Cinematic plates renamed to `scene2.png`…`scene6.png` (2=Battle, 3=Falls,
  4=Despair, 5=Accepts, 6=Powers Up); `scene26.png` = Dronagiri vista.
- `glow` texture is generated procedurally in BootScene (no glow.png dependency).

## Tech notes
- Design resolution: 720×1280, `Scale.FIT` + `CENTER_BOTH`.
- Raw art dropped in `src/Hanuman assets/` (gitignored); per-scene copies live in
  `public/assets/<scene>/` (committed + served at `/assets/...`).
- Preview any scene headlessly: `node tools/shot.mjs <out.png> <waitMs> <SceneKey>`.
