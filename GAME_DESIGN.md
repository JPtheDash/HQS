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

## Tech notes
- Design resolution: 720×1280, `Scale.FIT` + `CENTER_BOTH`.
- Raw art dropped in `src/Hanuman assets/` (gitignored); per-scene copies live in
  `public/assets/<scene>/` (committed + served at `/assets/...`).
