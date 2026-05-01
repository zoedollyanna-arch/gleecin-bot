import { get, run } from './src/db/database.js';

const createdBy = 'Created by: Jwett';

const quizzes = [
  {
    type: 'multiple_choice',
    question: 'Which function is used to detect collisions?',
    options: ['collision_start', 'touch_start', 'sensor', 'listen'],
    answer: 'collision_start',
    explanation: 'collision_start triggers when an object collides with something.'
  },
  {
    type: 'true_false',
    question: 'llGetOwner() returns the UUID of the object\'s owner.',
    answer: 'True',
    explanation: 'It returns the key of the owner.'
  },
  {
    type: 'fill_blank',
    question: '______ is used to apply a physical force to an object.',
    answer: 'llApplyImpulse',
    explanation: 'Used for physics-based movement.'
  },
  {
    type: 'debug',
    question: 'Fix: llSetScale(1,1,1);',
    answer: 'llSetScale(<1,1,1>);',
    explanation: 'Scale must be a vector.'
  },
  {
    type: 'prediction',
    question: 'What happens if llStopSound() is called?',
    answer: 'Any playing sound stops',
    explanation: 'It immediately halts sound playback.'
  },
  {
    type: 'multiple_choice',
    question: 'Which function continuously listens for chat on a channel?',
    options: ['llListen', 'llSay', 'llWhisper', 'llRegionSay'],
    answer: 'llListen',
    explanation: 'llListen registers a listener for incoming chat.'
  },
  {
    type: 'multiple_choice',
    question: 'Which event fires when a script receives HTTP data?',
    options: ['http_request', 'http_response', 'dataserver', 'listen'],
    answer: 'http_response',
    explanation: 'http_response handles replies from llHTTPRequest.'
  },
  {
    type: 'true_false',
    question: 'Negative channels are commonly used for private chat.',
    answer: 'True',
    explanation: 'Negative channels reduce accidental public listening.'
  },
  {
    type: 'fill_blank',
    question: 'Use ______ to request animation permissions from an avatar.',
    answer: 'llRequestPermissions',
    explanation: 'Required before triggering animations on avatars.'
  },
  {
    type: 'debug',
    question: 'Fix: llListen(-10, "", NULL_KEY, );',
    answer: 'llListen(-10, "", NULL_KEY, "");',
    explanation: 'The message filter parameter must be a string.'
  },
  {
    type: 'prediction',
    question: 'What happens if you never call llSetTimerEvent(0.0)?',
    answer: 'Timer keeps firing indefinitely',
    explanation: 'Non-zero interval continues to trigger timer events.'
  }
];

const challenges = [
  {
    question: 'Create a vending machine that charges users before giving an item.',
    answer: 'Use money() event, validate amount, then llGiveInventory.',
    explanation: 'Introduces payment handling.'
  },
  {
    question: 'Build a teleport pad with multiple destinations selectable via menu.',
    answer: 'Use llDialog and map buttons to coordinates.',
    explanation: 'Combines UI + teleport logic.'
  },
  {
    question: 'Create a script that logs every touch with timestamp.',
    answer: 'Use llGetUnixTime and store/log data.',
    explanation: 'Tracking + logging system.'
  },
  {
    question: 'Make a door that only opens during certain hours.',
    answer: 'Check llGetWallclock before allowing interaction.',
    explanation: 'Time-based logic.'
  },
  {
    question: 'Create a system that bans users after 3 failed attempts.',
    answer: 'Track attempts per user and block after threshold.',
    explanation: 'State tracking + security.'
  },
  {
    question: 'Build a leaderboard that tracks top interactions.',
    answer: 'Store counts in list and sort.',
    explanation: 'Data structures + ranking.'
  },
  {
    question: 'Make an object follow a path of waypoints.',
    answer: 'Store vectors in list and iterate through them.',
    explanation: 'Pathfinding logic.'
  },
  {
    question: 'Create a script that sends a private message instead of public chat.',
    answer: 'Use llRegionSayTo.',
    explanation: 'Private communication.'
  },
  {
    question: 'Build a reset system that restores default object state.',
    answer: 'Store defaults and reapply on reset.',
    explanation: 'State restoration.'
  },
  {
    question: 'Create a color picker menu using dialog buttons.',
    answer: 'Use llDialog and map selections to colors.',
    explanation: 'UI interaction.'
  },
  {
    question: 'Make an anti-spam system for chat commands.',
    answer: 'Track last message time per user.',
    explanation: 'Rate limiting.'
  },
  {
    question: 'Build a script that detects if object inventory changes.',
    answer: 'Use changed(CHANGED_INVENTORY).',
    explanation: 'Inventory events.'
  },
  {
    question: 'Create a system that rotates object based on user input.',
    answer: 'Parse chat commands and apply rotation.',
    explanation: 'User-controlled movement.'
  },
  {
    question: 'Make an object that only responds to its owner.',
    answer: 'Compare llDetectedKey with llGetOwner.',
    explanation: 'Ownership validation.'
  },
  {
    question: 'Build a system that tracks how long a user interacts.',
    answer: 'Store start time and calculate difference.',
    explanation: 'Session tracking.'
  },
  {
    question: 'Create a script that cycles through messages every few seconds.',
    answer: 'Use timer and list of messages.',
    explanation: 'Looping UI updates.'
  },
  {
    question: 'Make a system that changes object size over time.',
    answer: 'Use timer and adjust scale incrementally.',
    explanation: 'Animation logic.'
  },
  {
    question: 'Build a system that detects when object is rezzed.',
    answer: 'Use on_rez event.',
    explanation: 'Lifecycle events.'
  },
  {
    question: 'Create a script that counts unique visitors.',
    answer: 'Store avatar keys in list and avoid duplicates.',
    explanation: 'Set-like behavior.'
  },
  {
    question: 'Make a system that alerts owner when touched.',
    answer: 'Use llInstantMessage to owner.',
    explanation: 'Notifications.'
  },
  {
    question: 'Build a puzzle where objects must be touched in order.',
    answer: 'Track sequence and validate.',
    explanation: 'State machine.'
  },
  {
    question: 'Create a script that changes texture on interaction.',
    answer: 'Use llSetTexture.',
    explanation: 'Visual updates.'
  },
  {
    question: 'Make a cooldown-based reward system.',
    answer: 'Track last claim time per user.',
    explanation: 'Reward timing.'
  },
  {
    question: 'Build a system that syncs multiple objects together.',
    answer: 'Use link messages or chat channels.',
    explanation: 'Multi-object coordination.'
  },
  {
    question: 'Create a script that disables itself after use.',
    answer: 'Call llSetScriptState(FALSE).',
    explanation: 'Self-disabling logic.'
  },
  {
    type: 'challenge',
    question: 'Build a dialog menu with three options that sends a different message for each selection.',
    answer: 'Use llDialog with a private channel and handle responses in listen.',
    explanation: 'Requires channel management and branching logic.'
  },
  {
    type: 'challenge',
    question: 'Create a whitelist system that only allows specific avatars to interact.',
    answer: 'Store allowed UUIDs/names in a list and check in touch_start.',
    explanation: 'Demonstrates list searching and access control.'
  },
  {
    type: 'challenge',
    question: 'Make a notecard reader that outputs each line in sequence.',
    answer: 'Use llGetNotecardLine and dataserver event with an index.',
    explanation: 'Introduces asynchronous data handling.'
  },
  {
    type: 'challenge',
    question: 'Create a system that limits actions to once every 5 seconds per user.',
    answer: 'Track last-use timestamps per key and compare with llGetUnixTime().',
    explanation: 'Implements cooldown logic per avatar.'
  },
  {
    type: 'challenge',
    question: 'Build a multi-prim seat that reports how many avatars are seated.',
    answer: 'Iterate links and check llGetAgentSize for each link key.',
    explanation: 'Uses link traversal and avatar detection.'
  },
  {
    type: 'challenge',
    question: 'Create a secure door that opens only for group members and auto-closes after 3 seconds.',
    answer: 'Check llSameGroup, rotate/open, then use timer to close.',
    explanation: 'Combines permissions with timed state.'
  },
  {
    type: 'challenge',
    question: 'Implement a HUD command system using a negative chat channel.',
    answer: 'Use llListen on a negative channel and parse commands.',
    explanation: 'Private command handling pattern.'
  },
  {
    type: 'challenge',
    question: 'Build a counter that persists across script resets using description or notecard.',
    answer: 'Store value in llSetObjectDesc or external storage and reload on state_entry.',
    explanation: 'Introduces persistence workaround.'
  },
  {
    type: 'challenge',
    question: 'Create a follower object that maintains a 1m offset from an avatar smoothly.',
    answer: 'Poll target position with llGetObjectDetails and interpolate movement.',
    explanation: 'Requires vector math and smoothing.'
  },
  {
    type: 'challenge',
    question: 'Design a teleport network with multiple destinations selectable via dialog.',
    answer: 'Use llDialog to choose, then llTeleportAgent with mapped destinations.',
    explanation: 'Combines UI with teleport logic.'
  },
  {
    type: 'challenge',
    question: 'Create a rate-limited greeter that only greets each avatar once every 60 seconds.',
    answer: 'Maintain a map of avatar keys to last greet time and compare with llGetUnixTime().',
    explanation: 'Per-user cooldown with time tracking.'
  },
  {
    type: 'challenge',
    question: 'Build a vending machine that checks inventory and dispenses items with stock limits.',
    answer: 'Track stock counts, validate with llGetInventoryType, decrement on give.',
    explanation: 'State management and validation.'
  },
  {
    type: 'challenge',
    question: 'Implement a multi-step puzzle where switches must be activated in the correct order.',
    answer: 'Store sequence state and validate order on each interaction.',
    explanation: 'Finite state machine pattern.'
  },
  {
    type: 'challenge',
    question: 'Create a logging system that records interactions to a web endpoint.',
    answer: 'Use llHTTPRequest with serialized payload on events.',
    explanation: 'External logging via HTTP.'
  },
  {
    type: 'challenge',
    question: 'Design a light system that adapts brightness based on time of day.',
    answer: 'Poll llGetWallclock or region time and adjust PRIM_FULLBRIGHT/PRIM_GLOW.',
    explanation: 'Environment-aware behavior.'
  }
];

function getQuestionType(type) {
  if (type === 'fill_blank') return 'short_answer';
  if (type === 'debug') return 'code';
  if (type === 'true_false') return 'true_false';
  return 'multiple_choice';
}

function getDifficulty(type) {
  if (type === 'prediction' || type === 'debug') return 'hard';
  if (type === 'multiple_choice') return 'easy';
  return 'medium';
}

function getLevel(difficulty) {
  if (difficulty === 'easy') return 'beginner';
  if (difficulty === 'medium') return 'intermediate';
  return 'advanced';
}

async function seedChallengesAndQuizzes() {
  const admin = await get('SELECT id FROM users WHERE is_admin = true ORDER BY id ASC LIMIT 1');
  const authorId = admin?.id || 1;
  const lesson = await get('SELECT id FROM lessons ORDER BY id ASC LIMIT 1');

  for (const challenge of challenges) {
    const existing = await get('SELECT id FROM challenges WHERE LOWER(title) = LOWER($1)', [challenge.question]);

    if (existing?.id) {
      await run(
        `UPDATE challenges
         SET description = $1,
             difficulty = $2,
             starter_code = $3,
             solution = $4,
             explanation = $5,
             level = $6,
             price_tier = $7
         WHERE id = $8`,
        [
          `${challenge.question} ${createdBy}`,
          'easy',
          `default {\n    state_entry() {\n        // implement challenge\n    }\n}`,
          `default {\n    state_entry() {\n        llSay(0, "Challenge ready.");\n    }\n}`,
          `${challenge.explanation} ${createdBy}`,
          'beginner',
          'free',
          existing.id
        ]
      );
      continue;
    }

    await run(
      `INSERT INTO challenges (title, description, difficulty, starter_code, solution, explanation, level, price_tier, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        challenge.question,
        `${challenge.question} ${createdBy}`,
        'easy',
        `default {\n    state_entry() {\n        // implement challenge\n    }\n}`,
        `default {\n    state_entry() {\n        llSay(0, "Challenge ready.");\n    }\n}`,
        `${challenge.explanation} ${createdBy}`,
        'beginner',
        'free'
      ]
    );
  }

  for (const quiz of quizzes) {
    const difficulty = getDifficulty(quiz.type);
    const questionType = getQuestionType(quiz.type);
    const existing = await get('SELECT id FROM quizzes WHERE LOWER(title) = LOWER($1)', [quiz.question]);
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
          `${quiz.question} ${createdBy}`,
          lesson?.id || null,
          difficulty,
          70,
          10,
          'free',
          authorId,
          existing.id
        ]
      );
    } else {
      const created = await run(
        `INSERT INTO quizzes
          (title, description, lesson_id, difficulty, passing_score, time_limit_minutes, price_tier, created_by, created_at)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING id`,
        [
          quiz.question,
          `${quiz.question} ${createdBy}`,
          lesson?.id || null,
          difficulty,
          70,
          10,
          'free',
          authorId
        ]
      );
      quizId = created.id;
    }

    if (!quizId) continue;

    const options = Array.isArray(quiz.options) ? quiz.options : [];
    const existingQuestion = await get('SELECT id FROM quiz_questions WHERE quiz_id = $1 AND order_index = $2', [quizId, 1]);

    if (existingQuestion?.id) {
      await run(
        `UPDATE quiz_questions
         SET question_text = $1,
             question_type = $2,
             options = $3::jsonb,
             correct_answer = $4,
             explanation = $5,
             points = 1
         WHERE id = $6`,
        [
          quiz.question,
          questionType,
          JSON.stringify(options),
          quiz.answer,
          `${quiz.explanation} ${createdBy}`,
          existingQuestion.id
        ]
      );
    } else {
      await run(
        `INSERT INTO quiz_questions
          (quiz_id, question_text, question_type, options, correct_answer, explanation, points, order_index, created_at)
         VALUES
          ($1, $2, $3, $4::jsonb, $5, $6, 1, 1, NOW())`,
        [
          quizId,
          quiz.question,
          questionType,
          JSON.stringify(options),
          quiz.answer,
          `${quiz.explanation} ${createdBy}`
        ]
      );
    }

    await run(
      `UPDATE quizzes
       SET difficulty = $1
       WHERE id = $2`,
      [difficulty, quizId]
    );
  }

  console.log(`Seeded ${challenges.length} challenges and ${quizzes.length} quizzes.`);
}

seedChallengesAndQuizzes().catch((error) => {
  console.error('Failed to seed challenges/quizzes:', error);
  process.exitCode = 1;
});
