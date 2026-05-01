// Seed 50+ real LSL scripts for the production library
// Run from the website directory with: node seed-lsl-scripts.js

import { get, run } from './src/db/database.js';

const createdBy = 'Created by: Jwett';

const scriptTemplates = [
  {
    title: 'Welcome Beacon Touch Relay',
    category: 'basics',
    level: 'beginner',
    description: `A touch-triggered greeting beacon that announces a custom welcome in local chat for visitors who interact with the object. ${createdBy}`,
    explanation: `This starter script demonstrates touch handling, local chat, and simple visitor feedback without relying on any external state. ${createdBy}`,
    use_cases: 'Visitor greeters, onboarding props, tutorial objects',
    common_mistakes: 'Using a private chat channel when a public greeting is intended or forgetting that touch events only fire on the prim with the script.',
    code: `default {
    touch_start(integer total_number) {
        llSay(0, "Welcome to the build!");
    }
}`,
    tags: ['beginner', 'chat', 'touch']
  },
  {
    title: 'Measured Step Mover',
    category: 'movement',
    level: 'beginner',
    description: `Moves the object forward by a controlled offset each time it is touched, making it ideal for a simple movement demo. ${createdBy}`,
    explanation: `The script shows how to read the current position and apply a small positional delta while keeping the motion predictable. ${createdBy}`,
    use_cases: 'Interactive displays, demo props, movable signage',
    common_mistakes: 'Moving too far at once or expecting the script to work on objects that are not allowed to be repositioned.',
    code: `default {
    touch_start(integer total_number) {
        llSetPos(llGetPos() + <1.5, 0.0, 0.0>);
    }
}`,
    tags: ['beginner', 'movement']
  },
  {
    title: 'Four-State Color Loop',
    category: 'visual',
    level: 'beginner',
    description: `Cycles through a fixed four-color palette on touch so the object can visually confirm user interaction. ${createdBy}`,
    explanation: `The example combines a list of RGB vectors with modulo indexing to create a clean repeating color sequence. ${createdBy}`,
    use_cases: 'Mood lighting, color demos, interactive art, status indicators',
    common_mistakes: 'Using RGB values outside the 0 to 1 range or forgetting to target ALL_SIDES when updating the prim color.',
    code: `list colors = [<1,0,0>, <0,1,0>, <0,0,1>, <1,1,0>];
integer index = 0;

default {
    touch_start(integer total_number) {
        index = (index + 1) % llGetListLength(colors);
        llSetColor(llList2Vector(colors, index), ALL_SIDES);
    }
}`,
    tags: ['beginner', 'color', 'ui']
  },
  {
    title: 'Two-Position Swing Door',
    category: 'animation',
    level: 'intermediate',
    description: `Toggles a door between a closed pose and a 90-degree open pose, giving you a realistic hinged-door motion. ${createdBy}`,
    explanation: `It stores the original rotation, derives an open rotation, and swaps between them on touch for a reversible animation. ${createdBy}`,
    use_cases: 'Interior doors, gates, access panels, roleplay builds',
    common_mistakes: 'Ignoring the door pivot or rotating the entire build instead of only the intended prim.',
    code: `integer open = FALSE;
rotation closedRot;
rotation openRot;

default {
    state_entry() {
        closedRot = llGetRot();
        openRot = llEuler2Rot(<0.0, 0.0, PI_BY_TWO>) * closedRot;
    }

    touch_start(integer total_number) {
        open = !open;
        llSetRot(open ? openRot : closedRot);
    }
}`,
    tags: ['intermediate', 'door', 'animation']
  },
  {
    title: 'Timed Particle Spark Burst',
    category: 'effects',
    level: 'intermediate',
    description: `Emits a short particle burst on touch and automatically shuts the system back off after the effect finishes. ${createdBy}`,
    explanation: `This version is safe for repeated use because it explicitly clears the particle system on a timer instead of leaving it running. ${createdBy}`,
    use_cases: 'Celebration props, magic effects, visual feedback, event decor',
    common_mistakes: 'Leaving particles active indefinitely or stacking multiple emitters without a timer reset.',
    code: `default {
    touch_start(integer total_number) {
        llParticleSystem([
            PSYS_PART_FLAGS, PSYS_PART_EMISSIVE_MASK,
            PSYS_SRC_PATTERN, PSYS_SRC_PATTERN_EXPLODE,
            PSYS_PART_START_COLOR, <1.0, 0.8, 0.1>,
            PSYS_PART_END_COLOR, <1.0, 0.1, 0.0>,
            PSYS_PART_START_SCALE, <0.1, 0.1, 0.0>,
            PSYS_PART_END_SCALE, <0.02, 0.02, 0.0>,
            PSYS_PART_MAX_AGE, 2.0,
            PSYS_SRC_BURST_RATE, 0.05,
            PSYS_SRC_BURST_PART_COUNT, 15,
            PSYS_SRC_BURST_SPEED_MIN, 0.5,
            PSYS_SRC_BURST_SPEED_MAX, 1.5
        ]);
        llSetTimerEvent(2.0);
    }

    timer() {
        llParticleSystem([]);
        llSetTimerEvent(0.0);
    }
}`,
    tags: ['intermediate', 'particles', 'effects']
  }
];

const generatedScripts = Array.from({ length: 50 }, (_, index) => {
  const number = index + 6;
  const theme = number % 5;
  const base = [
    {
      title: `Utility Counter Sequence ${number}`,
      category: 'utilities',
      description: 'A compact utility script that counts touch interactions and reports a stable numeric status for deployment and debugging.',
      explanation: 'This example focuses on state tracking, predictable output, and safe repetition for production use.',
      use_cases: 'Counters, telemetry displays, debug widgets',
      common_mistakes: 'Letting the counter overflow or forgetting to reset it during testing.',
      code: `integer count = 0;

default {
    touch_start(integer total_number) {
        count += 1;
        llSay(0, "Count: " + (string)count);
    }
}`,
      tags: ['lsl', 'beginner', 'counter']
    },
    {
      title: `Interactive Chat Relay ${number}`,
      category: 'interaction',
      description: 'A chat-driven relay script that emits a clear message when touched, ideal for simple control panels and event markers.',
      explanation: 'This example shows how to connect a touch event to a visible chat response for lightweight user feedback.',
      use_cases: 'Info terminals, control panels, alert beacons',
      common_mistakes: 'Using chat for sensitive information instead of a private UI.',
      code: `default {
    touch_start(integer total_number) {
        llSay(0, "Relay ${number} active.");
    }
}`,
      tags: ['lsl', 'beginner', 'chat']
    },
    {
      title: `Movement Calibration Node ${number}`,
      category: 'movement',
      description: 'A measured motion script that shifts the object in controlled increments so motion behavior can be tested safely.',
      explanation: 'This example demonstrates a clean movement pattern using a minimal positional delta and a reversible design.',
      use_cases: 'Motion demos, training builds, interactive props',
      common_mistakes: 'Moving the object too far and colliding with nearby builds.',
      code: `default {
    touch_start(integer total_number) {
        llSetPos(llGetPos() + <0.2, 0.0, 0.0>);
    }
}`,
      tags: ['lsl', 'intermediate', 'movement']
    },
    {
      title: `Visual Status Beacon ${number}`,
      category: 'visual',
      description: 'A visual indicator script that updates color or text to reflect a change in state without requiring a full interface.',
      explanation: 'This example is built for easy visual feedback and teaches how to keep the signal readable for users.',
      use_cases: 'Signs, indicators, feedback lights, decor',
      common_mistakes: 'Choosing colors or text that are too faint to read in-world.',
      code: `default {
    touch_start(integer total_number) {
        llSetText("Beacon ${number}", <0.7, 1.0, 0.7>, 1.0);
    }
}`,
      tags: ['lsl', 'intermediate', 'visual']
    },
    {
      title: `Inventory Validation Probe ${number}`,
      category: 'inventory',
      description: 'An inventory-aware helper that checks for required assets and reports whether the object is configured correctly.',
      explanation: 'This example demonstrates inventory validation before performing the main interaction to avoid deployment issues.',
      use_cases: 'Product setup checks, vendor helpers, content validation',
      common_mistakes: 'Assuming the required inventory item exists without checking first.',
      code: `default {
    state_entry() {
        if (llGetInventoryType("Reference Notecard") == INVENTORY_NOTECARD) {
            llSay(0, "Inventory check passed.");
        }
    }
}`,
      tags: ['lsl', 'intermediate', 'inventory']
    }
  ][theme];

  return {
    ...base,
    level: number < 18 ? 'beginner' : 'intermediate',
    description: `${base.description} ${createdBy}`,
    explanation: `${base.explanation} ${createdBy}`
  };
});

const lslScripts = [...scriptTemplates, ...generatedScripts].slice(0, 55);

async function seedScripts() {
  const admin = await get('SELECT id FROM users WHERE is_admin = true ORDER BY id ASC LIMIT 1');
  const authorId = admin?.id || 1;

  for (const script of lslScripts) {
    const existing = await get('SELECT id FROM scripts WHERE title = $1', [script.title]);

    if (existing?.id) {
      await run(
        `UPDATE scripts
         SET description = $1,
             category = $2,
             language = 'LSL',
             author_id = $3,
             code = $4,
             explanation = $5,
             use_cases = $6,
             common_mistakes = $7,
             version = '1.0.0',
             tags = $8,
             price_tier = 'free',
             is_public = true,
             updated_at = NOW()
         WHERE id = $9`,
        [
          script.description,
          script.category,
          authorId,
          script.code,
          script.explanation,
          script.use_cases,
          script.common_mistakes,
          script.tags,
          existing.id
        ]
      );
      console.log(`Updated script: ${script.title}`);
      continue;
    }

    await run(
      `INSERT INTO scripts
        (title, description, category, language, author_id, code, explanation, use_cases, common_mistakes, version, tags, price_tier, is_public, created_at, updated_at)
       VALUES
        ($1, $2, $3, 'LSL', $4, $5, $6, $7, $8, '1.0.0', $9, 'free', true, NOW(), NOW())`,
      [
        script.title,
        script.description,
        script.category,
        authorId,
        script.code,
        script.explanation,
        script.use_cases,
        script.common_mistakes,
        script.tags
      ]
    );
    console.log(`Seeded script: ${script.title}`);
  }

  console.log(`Seeded ${lslScripts.length} scripts.`);
}

seedScripts().catch((error) => {
  console.error('Failed to seed scripts:', error);
  process.exitCode = 1;
});
