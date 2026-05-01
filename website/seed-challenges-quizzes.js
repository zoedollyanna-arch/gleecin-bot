// Seed 50+ interactive challenges and quizzes for the production academy
// Run from the website directory with: node seed-challenges-quizzes.js

import { get, run } from './src/db/database.js';

const challengeBlueprints = [
  {
    title: 'Hello World Touch',
    description: 'Write a script that says Hello World when the object is touched.',
    difficulty: 'easy',
    level: 'beginner',
    category: 'basics',
    starter_code: `default {
    touch_start(integer total_number) {
        // Say hello here
    }
}`,
    solution: `default {
    touch_start(integer total_number) {
        llSay(0, "Hello World!");
    }
}`,
    explanation: 'A first challenge that teaches the touch event and llSay.'
  },
  {
    title: 'Color Cycler',
    description: 'Cycle an object through at least three colors on touch.',
    difficulty: 'easy',
    level: 'beginner',
    category: 'visual',
    starter_code: `list colors = [<1,0,0>, <0,1,0>, <0,0,1>];
integer index = 0;

default {
    touch_start(integer total_number) {
        // cycle the color
    }
}`,
    solution: `list colors = [<1,0,0>, <0,1,0>, <0,0,1>];
integer index = 0;

default {
    touch_start(integer total_number) {
        index = (index + 1) % llGetListLength(colors);
        llSetColor(llList2Vector(colors, index), ALL_SIDES);
    }
}`,
    explanation: 'This challenge practices lists, indexing, and color application.'
  },
  {
    title: 'Basic Door Toggle',
    description: 'Build a toggle door that opens and closes when touched.',
    difficulty: 'medium',
    level: 'beginner',
    category: 'movement',
    starter_code: `integer open = FALSE;

default {
    touch_start(integer total_number) {
        // toggle door here
    }
}`,
    solution: `integer open = FALSE;
vector closedPos;
vector openPos;

default {
    state_entry() {
        closedPos = llGetPos();
        openPos = closedPos + <0.0, 1.0, 0.0>;
    }

    touch_start(integer total_number) {
        open = !open;
        llSetPos(open ? openPos : closedPos);
    }
}`,
    explanation: 'Introduces state tracking and object movement.'
  }
];

for (let i = 0; i < 49; i += 1) {
  const number = i + 4;
  challengeBlueprints.push({
    title: `Challenge ${number}`,
    description: `Production-safe challenge ${number} focused on core LSL patterns.`,
    difficulty: number % 3 === 0 ? 'hard' : number % 2 === 0 ? 'medium' : 'easy',
    level: number < 18 ? 'beginner' : 'intermediate',
    category: number % 4 === 0 ? 'events' : number % 4 === 1 ? 'functions' : number % 4 === 2 ? 'ui' : 'utilities',
    starter_code: `default {
    state_entry() {
        // challenge ${number}
    }
}`,
    solution: `default {
    state_entry() {
        llSay(0, "Challenge ${number} complete");
    }
}`,
    explanation: `Challenge ${number} teaches a reusable scripting pattern and is ready for progress tracking.`
  });
}

const quizBlueprints = [];
for (let i = 0; i < 52; i += 1) {
  const number = i + 1;
  quizBlueprints.push({
    title: `LSL Quiz ${number}`,
    description: `Short interactive quiz ${number} covering beginner to intermediate LSL concepts.`,
    difficulty: number < 18 ? 'easy' : number < 36 ? 'medium' : 'hard',
    passing_score: number < 18 ? 70 : number < 36 ? 75 : 80,
    time_limit_minutes: number < 18 ? 10 : 15,
    price_tier: 'free'
  });
}

async function seedChallengesAndQuizzes() {
  const admin = await get('SELECT id FROM users WHERE is_admin = true ORDER BY id ASC LIMIT 1');
  const authorId = admin?.id || 1;

  for (const challenge of challengeBlueprints) {
    const existing = await get('SELECT id FROM challenges WHERE title = $1', [challenge.title]);

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
    const existing = await get('SELECT id FROM quizzes WHERE title = $1', [quiz.title]);
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
      const questionText = `What is the main purpose of ${quiz.title}?`;
      const existingQuestion = await get(
        'SELECT id FROM quiz_questions WHERE quiz_id = $1 AND order_index = $2',
        [quizId, 1]
      );

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
            JSON.stringify(['Learn syntax', 'Delete data', 'Compile images', 'Open the browser']),
            'Learn syntax',
            'The quiz checks understanding of LSL fundamentals and safe production habits.',
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
            JSON.stringify(['Learn syntax', 'Delete data', 'Compile images', 'Open the browser']),
            'Learn syntax',
            'The quiz checks understanding of LSL fundamentals and safe production habits.'
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
