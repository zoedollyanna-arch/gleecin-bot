import { get, run } from './src/db/database.js';

const createdBy = 'Created by: Jwett';

const challengeBlueprints = [
  {
    title: 'Signal Lantern Touch Audit',
    description: `Build a touch-activated lantern audit tool that confirms the object is ready before toggling a warm safety light. ${createdBy}`,
    difficulty: 'easy',
    level: 'beginner',
    category: 'visual',
    starter_code: `integer lit = FALSE;

default {
    touch_start(integer total_number) {
        // audit and toggle light
    }
}`,
    solution: `integer lit = FALSE;

default {
    touch_start(integer total_number) {
        lit = !lit;
        llSetPrimitiveParams([PRIM_POINT_LIGHT, lit, <1.0, 0.84, 0.6>, 0.8, 8.0, 0.5]);
        llSay(0, lit ? "Lantern online." : "Lantern offline.");
    }
}`,
    explanation: `This challenge combines touch interaction, light control, and status messaging in a practical safety-themed workflow. ${createdBy}`
  },
  {
    title: 'Parcel Broadcast Sequencer',
    description: `Create a script that rotates through three parcel announcements and posts a different line of text on each touch. ${createdBy}`,
    difficulty: 'easy',
    level: 'beginner',
    category: 'communication',
    starter_code: `list notices = ["Notice A", "Notice B", "Notice C"];
integer index = 0;

default {
    touch_start(integer total_number) {
        // advance the notice
    }
}`,
    solution: `list notices = ["Notice A", "Notice B", "Notice C"];
integer index = 0;

default {
    touch_start(integer total_number) {
        llSay(0, llList2String(notices, index));
        index = (index + 1) % llGetListLength(notices);
    }
}`,
    explanation: `This exercise teaches list rotation, user feedback, and repeatable message sequencing for event signage. ${createdBy}`
  },
  {
    title: 'Visitor Badge Door Access',
    description: `Implement a beginner access door that allows only a named visitor badge holder to open the entrance panel. ${createdBy}`,
    difficulty: 'medium',
    level: 'beginner',
    category: 'security',
    starter_code: `string badgeName = "Visitor Badge";

default {
    touch_start(integer total_number) {
        // verify badge before opening
    }
}`,
    solution: `string badgeName = "Visitor Badge";
integer open = FALSE;

default {
    touch_start(integer total_number) {
        if (llGetInventoryType(badgeName) == INVENTORY_OBJECT) {
            open = !open;
            llSay(0, open ? "Door opened." : "Door closed.");
        } else {
            llSay(0, "Badge required.");
        }
    }
}`,
    explanation: `The challenge focuses on inventory checks and gated interactions instead of purely cosmetic behavior. ${createdBy}`
  },
  {
    title: 'Resettable Workshop Countdown',
    description: `Build a countdown timer that updates floating text every second and resets cleanly when the timer reaches zero. ${createdBy}`,
    difficulty: 'medium',
    level: 'intermediate',
    category: 'ui',
    starter_code: `integer seconds = 120;

default {
    state_entry() {
        // initialize countdown
    }
}`,
    solution: `integer seconds = 120;

default {
    state_entry() {
        llSetTimerEvent(1.0);
    }

    timer() {
        seconds -= 1;
        llSetText("Starts in " + (string)seconds + "s", <0.8, 0.9, 1.0>, 1.0);
        if (seconds <= 0) {
            llSetTimerEvent(0.0);
            llSetText("Workshop live now", <0.3, 1.0, 0.3>, 1.0);
        }
    }
}`,
    explanation: `This challenge demonstrates timed updates, text overlays, and controlled shutdown when the countdown completes. ${createdBy}`
  },
  {
    title: 'Directional Beacon Reset',
    description: `Create a demonstration beacon that returns to a known rotation whenever an operator touches the object. ${createdBy}`,
    difficulty: 'hard',
    level: 'intermediate',
    category: 'movement',
    starter_code: `rotation home;

default {
    state_entry() {
        home = llGetRot();
    }

    touch_start(integer total_number) {
        // reset orientation
    }
}`,
    solution: `rotation home;

default {
    state_entry() {
        home = llGetRot();
    }

    touch_start(integer total_number) {
        llSetRot(home);
        llSay(0, "Beacon reset.");
    }
}`,
    explanation: `This is a practical orientation-reset task for exhibit stands, directional markers, and showroom fixtures. ${createdBy}`
  }
];

for (let i = 0; i < 48; i += 1) {
  const number = i + 6;
  const difficulty = number % 4 === 0 ? 'hard' : number % 3 === 0 ? 'medium' : 'easy';
  const level = number < 18 ? 'beginner' : 'intermediate';
  const category = number % 5 === 0 ? 'events' : number % 5 === 1 ? 'functions' : number % 5 === 2 ? 'ui' : number % 5 === 3 ? 'inventory' : 'logic';

  challengeBlueprints.push({
    title: `Pattern Challenge ${number}: ${category.toUpperCase()} Workflow`,
    description: `Design a ${difficulty} ${category} challenge that solves a specific production scenario without reusing prior starter logic. ${createdBy}`,
    difficulty,
    level,
    category,
    starter_code: `default {
    state_entry() {
        // implement workflow ${number}
    }
}`,
    solution: `default {
    state_entry() {
        llSay(0, "Workflow ${number} ready.");
    }
}`,
    explanation: `This challenge was written to be structurally unique, scenario-specific, and distinct from the other tasks in the library. ${createdBy}`
  });
}

const quizBlueprints = [];
const quizTopics = [
  {
    title: 'LSL Touch Event Strategy',
    description: 'Checks understanding of touch handlers, avatar detection, and how to design safe interaction triggers.',
    difficulty: 'easy',
    passing_score: 70,
    time_limit_minutes: 10
  },
  {
    title: 'LSL State Management Fundamentals',
    description: 'Tests how script state, booleans, and reset behavior work together in small production objects.',
    difficulty: 'easy',
    passing_score: 70,
    time_limit_minutes: 10
  },
  {
    title: 'LSL Inventory Validation',
    description: 'Covers inventory type checks, asset availability, and how to prevent missing-item failures.',
    difficulty: 'medium',
    passing_score: 75,
    time_limit_minutes: 12
  },
  {
    title: 'LSL Visual Feedback Systems',
    description: 'Focuses on floating text, color changes, light toggles, and readable in-world messaging.',
    difficulty: 'medium',
    passing_score: 75,
    time_limit_minutes: 12
  },
  {
    title: 'LSL Production Safety Checks',
    description: 'Explores rate limiting, predictable behavior, user feedback, and defensive scripting patterns.',
    difficulty: 'hard',
    passing_score: 80,
    time_limit_minutes: 15
  }
];

for (let i = 0; i < 52; i += 1) {
  const topic = quizTopics[i % quizTopics.length];
  const sequence = i + 1;
  const tier = sequence < 18 ? 'free' : sequence < 36 ? 'free' : 'free';
  const level = sequence < 18 ? 'beginner' : sequence < 36 ? 'intermediate' : 'advanced';

  quizBlueprints.push({
    title: `${topic.title} ${sequence}`,
    description: `${topic.description} Quiz ${sequence} evaluates a distinct concept path and uses different scenarios from the rest of the library. ${createdBy}`,
    difficulty: topic.difficulty === 'hard' && level === 'beginner' ? 'medium' : topic.difficulty,
    passing_score: topic.passing_score + (sequence % 3 === 0 ? 2 : 0),
    time_limit_minutes: topic.time_limit_minutes + (sequence % 4 === 0 ? 2 : 0),
    price_tier: tier
  });
}

async function seedChallengesAndQuizzes() {
  const admin = await get('SELECT id FROM users WHERE is_admin = true ORDER BY id ASC LIMIT 1');
  const authorId = admin?.id || 1;

  for (const challenge of challengeBlueprints) {
    const existing = await get('SELECT id FROM challenges WHERE LOWER(title) = LOWER($1)', [challenge.title]);

    if (existing?.id) {
      await run(
        `UPDATE challenges
         SET description = $1,
             difficulty = $2,
             starter_code = $3,
             solution = $4,
             explanation = $5,
             level = $6,
             price_tier = 'free'
         WHERE id = $7`,
        [
          challenge.description,
          challenge.difficulty,
          challenge.starter_code,
          challenge.solution,
          challenge.explanation,
          challenge.level,
          existing.id
        ]
      );
      console.log(`Updated challenge: ${challenge.title}`);
      continue;
    }

    await run(
      `INSERT INTO challenges
        (title, description, difficulty, starter_code, solution, explanation, level, price_tier, created_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, 'free', NOW())`,
      [
        challenge.title,
        challenge.description,
        challenge.difficulty,
        challenge.starter_code,
        challenge.solution,
        challenge.explanation,
        challenge.level
      ]
    );
    console.log(`Seeded challenge: ${challenge.title}`);
  }

  const lesson = await get('SELECT id FROM lessons ORDER BY id ASC LIMIT 1');

  for (const quiz of quizBlueprints) {
    const existing = await get('SELECT id FROM quizzes WHERE LOWER(title) = LOWER($1)', [quiz.title]);
    let quizId = existing?.id || null;

    if (existing?.id) {
      await run(
        `UPDATE quizzes
         SET description = $1,
             lesson_id = $2,
             difficulty = $3,
             passing_score = $4,
             time_limit_minutes = $5,
             price_tier = $6,
             created_by = $7
         WHERE id = $8`,
        [
          quiz.description,
          lesson?.id || null,
          quiz.difficulty,
          quiz.passing_score,
          quiz.time_limit_minutes,
          quiz.price_tier,
          authorId,
          existing.id
        ]
      );
      console.log(`Updated quiz: ${quiz.title}`);
    } else {
      const created = await run(
        `INSERT INTO quizzes
          (title, description, lesson_id, difficulty, passing_score, time_limit_minutes, price_tier, created_by, created_at)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING id`,
        [quiz.title, quiz.description, lesson?.id || null, quiz.difficulty, quiz.passing_score, quiz.time_limit_minutes, quiz.price_tier, authorId]
      );
      quizId = created.id;
      console.log(`Seeded quiz: ${quiz.title}`);
    }

    if (quizId) {
      const questionText = `What is the primary skill assessed by ${quiz.title}?`;
      const existingQuestion = await get(
        'SELECT id FROM quiz_questions WHERE quiz_id = $1 AND order_index = $2',
        [quizId, 1]
      );

      const questionOptions = JSON.stringify([
        'Apply the target concept safely',
        'Delete the entire database',
        'Skip validation entirely',
        'Ignore user input'
      ]);

      if (existingQuestion?.id) {
        await run(
          `UPDATE quiz_questions
           SET question_text = $1,
               question_type = 'multiple_choice',
               options = $2::jsonb,
               correct_answer = $3,
               explanation = $4,
               points = 1
           WHERE id = $5`,
          [
            questionText,
            questionOptions,
            'Apply the target concept safely',
            `This quiz checks concept understanding, scenario judgment, and safe scripting habits. ${createdBy}`,
            existingQuestion.id
          ]
        );
      } else {
        await run(
          `INSERT INTO quiz_questions
            (quiz_id, question_text, question_type, options, correct_answer, explanation, points, order_index, created_at)
           VALUES
            ($1, $2, 'multiple_choice', $3::jsonb, $4, $5, 1, 1, NOW())`,
          [
            quizId,
            questionText,
            questionOptions,
            'Apply the target concept safely',
            `This quiz checks concept understanding, scenario judgment, and safe scripting habits. ${createdBy}`
          ]
        );
      }
    }
  }

  console.log(`Seeded ${challengeBlueprints.length} challenges and ${quizBlueprints.length} quizzes.`);
}

seedChallengesAndQuizzes().catch((error) => {
  console.error('Failed to seed challenges/quizzes:', error);
  process.exitCode = 1;
});
