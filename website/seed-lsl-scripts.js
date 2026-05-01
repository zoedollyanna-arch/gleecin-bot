import { get, run } from './src/db/database.js';

const createdBy = 'Created by: Jwett';

const lslScripts = [
  {
    title: 'Touch Activated Light Toggle',
    category: 'environment',
    difficulty: 'beginner',
    description: 'Toggles a light on and off when the object is touched, useful for lamps and switches.',
    code: `integer on = FALSE;
default {
    touch_start(integer total_number) {
        on = !on;
        llSetPrimitiveParams([PRIM_FULLBRIGHT, ALL_SIDES, on]);
    }
}`,
    explanation: 'Uses a boolean toggle to switch light state using PRIM_FULLBRIGHT.',
    use_cases: 'Lamps, light switches, decorative lighting',
    mistakes: 'Forgetting to initialize the boolean or not updating all sides.',
    tags: ['beginner', 'touch', 'lighting']
  },
  {
    title: 'Proximity Greeting System',
    category: 'interaction',
    difficulty: 'beginner',
    description: 'Greets avatars when they come within range using sensor detection.',
    code: `default {
    state_entry() {
        llSensorRepeat("", NULL_KEY, AGENT, 10.0, PI, 5.0);
    }
    sensor(integer num_detected) {
        llSay(0, "Welcome " + llDetectedName(0));
    }
}`,
    explanation: 'Uses llSensorRepeat to detect nearby avatars and greet them.',
    use_cases: 'Stores, welcome areas, events',
    mistakes: 'Spamming chat too frequently with low repeat intervals.',
    tags: ['beginner', 'sensor', 'greeting']
  },
  {
    title: 'Random Color Generator',
    category: 'visual',
    difficulty: 'beginner',
    description: 'Changes the object\'s color randomly each time it is touched.',
    code: `default {
    touch_start(integer total_number) {
        llSetColor(<llFrand(1.0), llFrand(1.0), llFrand(1.0)>, ALL_SIDES);
    }
}`,
    explanation: 'Generates random RGB values using llFrand.',
    use_cases: 'Decor objects, games, effects',
    mistakes: 'Not normalizing values between 0–1.',
    tags: ['beginner', 'color', 'effects']
  },
  {
    title: 'Simple Sit Teleporter',
    category: 'movement',
    difficulty: 'intermediate',
    description: 'Teleports a user to a preset location when they sit on the object.',
    code: `default {
    changed(integer change) {
        if (change & CHANGED_LINK) {
            key id = llAvatarOnSitTarget();
            if (id) {
                llTeleportAgent(id, "Sandbox", <128,128,25>, ZERO_VECTOR);
            }
        }
    }
}`,
    explanation: 'Detects sit events and teleports the avatar.',
    use_cases: 'Teleport pads, portals',
    mistakes: 'Missing permissions or invalid region name.',
    tags: ['intermediate', 'teleport', 'sit']
  },
  {
    title: 'Countdown Timer Display',
    category: 'utility',
    difficulty: 'beginner',
    description: 'Displays a countdown timer above the object.',
    code: `integer time = 10;
default {
    state_entry() {
        llSetTimerEvent(1.0);
    }
    timer() {
        if (time > 0) {
            llSetText("Time: " + (string)time, <1,1,1>, 1.0);
            time--;
        }
    }
}`,
    explanation: 'Uses a timer event to decrement and display time.',
    use_cases: 'Games, events, timed tasks',
    mistakes: 'Not stopping timer at zero.',
    tags: ['beginner', 'timer', 'text']
  },
  {
    title: 'Private Chat Listener',
    category: 'communication',
    difficulty: 'intermediate',
    description: 'Listens on a private channel and responds to commands.',
    code: `integer channel = -12345;
default {
    state_entry() {
        llListen(channel, "", NULL_KEY, "");
    }
    listen(integer chan, string name, key id, string msg) {
        if (msg == "ping") llRegionSayTo(id, channel, "pong");
    }
}`,
    explanation: 'Uses llListen on a negative channel for private communication.',
    use_cases: 'HUD commands, admin tools',
    mistakes: 'Using public channels instead of private ones.',
    tags: ['intermediate', 'chat', 'listener']
  },
  {
    title: 'Object Rotation Controller',
    category: 'movement',
    difficulty: 'beginner',
    description: 'Rotates an object continuously when activated.',
    code: `default {
    state_entry() {
        llTargetOmega(<0,0,1>, 1.0, 1.0);
    }
}`,
    explanation: 'Applies continuous rotation using llTargetOmega.',
    use_cases: 'Displays, signs, decorative items',
    mistakes: 'Using too high rotation speed.',
    tags: ['beginner', 'rotation', 'animation']
  },
  {
    title: 'Access Control Door',
    category: 'security',
    difficulty: 'intermediate',
    description: 'Allows only specific users to open a door.',
    code: `list allowed = ["Avatar Name"];
default {
    touch_start(integer total_number) {
        string name = llDetectedName(0);
        if (~llListFindList(allowed, [name])) {
            llSay(0, "Access granted");
        } else {
            llSay(0, "Access denied");
        }
    }
}`,
    explanation: 'Checks avatar name against a whitelist.',
    use_cases: 'Private areas, VIP access',
    mistakes: 'Using names instead of UUIDs.',
    tags: ['intermediate', 'security', 'access-control']
  },
  {
    title: 'Floating Text Updater',
    category: 'visual',
    difficulty: 'beginner',
    description: 'Updates floating text dynamically based on interaction.',
    code: `default {
    touch_start(integer total_number) {
        llSetText("Touched!", <1,0,0>, 1.0);
    }
}`,
    explanation: 'Uses llSetText to display status above object.',
    use_cases: 'Labels, status indicators',
    mistakes: 'Using too bright or unreadable colors.',
    tags: ['beginner', 'text', 'ui']
  },
  {
    title: 'Sound Trigger Pad',
    category: 'audio',
    difficulty: 'beginner',
    description: 'Plays a sound when touched.',
    code: `default {
    touch_start(integer total_number) {
        llPlaySound("sound_uuid", 1.0);
    }
}`,
    explanation: 'Triggers sound playback using llPlaySound.',
    use_cases: 'Games, effects, alerts',
    mistakes: 'Missing sound asset in inventory.',
    tags: ['beginner', 'sound', 'interaction']
  },
  {
    title: 'Dialog Menu Controller',
    category: 'ui',
    difficulty: 'intermediate',
    description: 'Displays a dialog menu to users with multiple selectable options and responds based on their choice.',
    code: `integer channel;
default {
    touch_start(integer total_number) {
        channel = (integer)llFrand(1000000) * -1;
        llListen(channel, "", llDetectedKey(0), "");
        llDialog(llDetectedKey(0), "Choose an option:", ["Start","Stop","Reset"], channel);
    }
    listen(integer c, string n, key id, string msg) {
        if (msg == "Start") llSay(0, "Started");
        else if (msg == "Stop") llSay(0, "Stopped");
        else if (msg == "Reset") llResetScript();
    }
}`,
    explanation: 'Uses llDialog with a dynamically generated private channel to handle user input.',
    use_cases: 'Control panels, HUD menus, interactive objects',
    mistakes: 'Not removing listeners or reusing channels improperly.',
    tags: ['intermediate', 'ui', 'dialog']
  },
  {
    title: 'Timed Auto Door System',
    category: 'movement',
    difficulty: 'intermediate',
    description: 'Automatically opens a door when touched and closes it after a delay.',
    code: `integer open = FALSE;
default {
    touch_start(integer total_number) {
        if (!open) {
            open = TRUE;
            llSetRot(llEuler2Rot(<0,0,PI/2>));
            llSetTimerEvent(5.0);
        }
    }
    timer() {
        open = FALSE;
        llSetRot(llEuler2Rot(<0,0,0>));
        llSetTimerEvent(0.0);
    }
}`,
    explanation: 'Combines rotation and timer events to simulate door behavior.',
    use_cases: 'Doors, gates, access systems',
    mistakes: 'Not resetting timer properly.',
    tags: ['intermediate', 'movement', 'door']
  },
  {
    title: 'Multi-User Seat Tracker',
    category: 'interaction',
    difficulty: 'advanced',
    description: 'Tracks multiple avatars sitting on linked objects and reports occupancy.',
    code: `default {
    changed(integer change) {
        if (change & CHANGED_LINK) {
            integer count = llGetNumberOfPrims();
            integer i;
            for (i = 0; i <= count; i++) {
                key k = llGetLinkKey(i);
                if (llGetAgentSize(k) != ZERO_VECTOR) {
                    llSay(0, "Seated: " + llKey2Name(k));
                }
            }
        }
    }
}`,
    explanation: 'Iterates through linked prims to detect seated avatars.',
    use_cases: 'Furniture systems, games, multi-user setups',
    mistakes: 'Incorrect link indexing.',
    tags: ['advanced', 'interaction', 'seat']
  },
  {
    title: 'HTTP Data Fetcher',
    category: 'network',
    difficulty: 'advanced',
    description: 'Fetches external data from a web API and displays it in-world.',
    code: `key request;
default {
    state_entry() {
        request = llHTTPRequest("https://api.example.com/data", [], "");
    }
    http_response(key id, integer status, list meta, string body) {
        if (id == request) {
            llSay(0, "Data: " + body);
        }
    }
}`,
    explanation: 'Uses llHTTPRequest and handles responses asynchronously.',
    use_cases: 'Live data feeds, dashboards',
    mistakes: 'Ignoring HTTP response limits.',
    tags: ['advanced', 'network', 'http']
  },
  {
    title: 'Collision Damage System',
    category: 'gameplay',
    difficulty: 'intermediate',
    description: 'Applies damage when an object collides with avatars.',
    code: `default {
    collision_start(integer total_number) {
        llSay(0, "Collision detected!");
    }
}`,
    explanation: 'Uses collision events to detect interactions.',
    use_cases: 'Games, traps, combat systems',
    mistakes: 'Not filtering collision types.',
    tags: ['intermediate', 'gameplay', 'collision']
  },
  {
    title: 'Animated Texture Cycler',
    category: 'visual',
    difficulty: 'intermediate',
    description: 'Cycles through textures to create animation effects.',
    code: `default {
    state_entry() {
        llSetTextureAnim(ANIM_ON | LOOP, ALL_SIDES, 4, 4, 0, 0, 1.0);
    }
}`,
    explanation: 'Uses texture animation parameters.',
    use_cases: 'Billboards, screens',
    mistakes: 'Incorrect frame sizing.',
    tags: ['intermediate', 'visual', 'texture']
  },
  {
    title: 'Object Follow Script',
    category: 'movement',
    difficulty: 'advanced',
    description: 'Makes an object follow a specific avatar.',
    code: `key target;
default {
    touch_start(integer total_number) {
        target = llDetectedKey(0);
        llSetTimerEvent(0.5);
    }
    timer() {
        vector pos = llList2Vector(llGetObjectDetails(target, [OBJECT_POS]),0);
        llSetPos(pos + <1,0,0>);
    }
}`,
    explanation: 'Continuously updates position relative to a target avatar.',
    use_cases: 'Pets, companions',
    mistakes: 'High frequency causing lag.',
    tags: ['advanced', 'movement', 'follow']
  },
  {
    title: 'Permission-Based Animation Trigger',
    category: 'animation',
    difficulty: 'intermediate',
    description: 'Requests permission to trigger an animation on the user.',
    code: `default {
    touch_start(integer total_number) {
        llRequestPermissions(llDetectedKey(0), PERMISSION_TRIGGER_ANIMATION);
    }
    run_time_permissions(integer perm) {
        if (perm & PERMISSION_TRIGGER_ANIMATION) {
            llStartAnimation("wave");
        }
    }
}`,
    explanation: 'Handles permission system before animation execution.',
    use_cases: 'Roleplay, interactions',
    mistakes: 'Not handling denied permissions.',
    tags: ['intermediate', 'animation', 'permissions']
  },
  {
    title: 'Inventory Giver System',
    category: 'inventory',
    difficulty: 'beginner',
    description: 'Gives an item from inventory when touched.',
    code: `default {
    touch_start(integer total_number) {
        llGiveInventory(llDetectedKey(0), "Item Name");
    }
}`,
    explanation: 'Transfers inventory item to avatar.',
    use_cases: 'Freebies, vendors',
    mistakes: 'Incorrect item name.',
    tags: ['beginner', 'inventory', 'giver']
  },
  {
    title: 'Region Time Display',
    category: 'utility',
    difficulty: 'intermediate',
    description: 'Displays current region time above the object.',
    code: `default {
    state_entry() {
        llSetTimerEvent(10.0);
    }
    timer() {
        llSetText((string)llGetWallclock(), <1,1,1>,1.0);
    }
}`,
    explanation: 'Uses wall clock function for time display.',
    use_cases: 'Clocks, dashboards',
    mistakes: 'Confusing UTC vs local time.',
    tags: ['intermediate', 'utility', 'time']
  },
  {
    title: 'Dynamic NPC Wander System',
    category: 'npc',
    difficulty: 'advanced',
    description: 'Creates a wandering NPC behavior by moving randomly within a defined radius.',
    code: `vector home;
default {
    state_entry() {
        home = llGetPos();
        llSetTimerEvent(5.0);
    }
    timer() {
        vector offset = <llFrand(5)-2.5, llFrand(5)-2.5, 0>;
        llSetPos(home + offset);
    }
}`,
    explanation: 'Stores original position and applies random offsets periodically.',
    use_cases: 'NPCs, animals, ambient life',
    mistakes: 'Moving too far outside region bounds.',
    tags: ['advanced', 'npc', 'wander']
  },
  {
    title: 'Secure Password Access Panel',
    category: 'security',
    difficulty: 'advanced',
    description: 'Allows access only if the correct password is entered via chat.',
    code: `string password = "1234";
integer channel = -999;
default {
    state_entry() { llListen(channel, "", NULL_KEY, ""); }
    listen(integer c, string n, key id, string msg) {
        if (msg == password) llSay(0, "Access Granted");
        else llSay(0, "Wrong Password");
    }
}`,
    explanation: 'Uses private channel listening for secure input.',
    use_cases: 'Doors, admin panels',
    mistakes: 'Hardcoding passwords without encryption.',
    tags: ['advanced', 'security', 'password']
  },
  {
    title: 'Vehicle Speed Limiter',
    category: 'vehicle',
    difficulty: 'advanced',
    description: 'Limits maximum speed of a moving object.',
    code: `default {
    timer() {
        vector vel = llGetVel();
        if (llVecMag(vel) > 10) {
            llSetVel(llVecNorm(vel)*10, FALSE);
        }
    }
}`,
    explanation: 'Normalizes velocity to enforce a speed cap.',
    use_cases: 'Cars, boats',
    mistakes: 'Not accounting for physics state.',
    tags: ['advanced', 'vehicle', 'physics']
  },
  {
    title: 'Multi-Step Quest Tracker',
    category: 'gameplay',
    difficulty: 'advanced',
    description: 'Tracks player progress through multiple quest stages.',
    code: `integer stage = 0;
default {
    touch_start(integer total_number) {
        stage++;
        llSay(0, "Stage: " + (string)stage);
    }
}`,
    explanation: 'Increments quest stage with each interaction.',
    use_cases: 'RPG systems',
    mistakes: 'Not persisting stage between sessions.',
    tags: ['advanced', 'gameplay', 'quest']
  },
  {
    title: 'Group-Only Access Checker',
    category: 'security',
    difficulty: 'intermediate',
    description: 'Allows interaction only if the avatar is in the same group.',
    code: `default {
    touch_start(integer total_number) {
        if (llSameGroup(llDetectedKey(0))) {
            llSay(0, "Group access granted");
        }
    }
}`,
    explanation: 'Uses llSameGroup for permission checks.',
    use_cases: 'Private builds',
    mistakes: 'Forgetting to set object group.',
    tags: ['intermediate', 'security', 'group']
  },
  {
    title: 'Hovering Object Stabilizer',
    category: 'physics',
    difficulty: 'advanced',
    description: 'Maintains a constant hover height above ground.',
    code: `default {
    state_entry() {
        llSetHoverHeight(2.0, TRUE, 1.0);
    }
}`,
    explanation: 'Uses built-in hover function for stabilization.',
    use_cases: 'Floating platforms',
    mistakes: 'Conflicting physics settings.',
    tags: ['advanced', 'physics', 'hover']
  },
  {
    title: 'Multi-Channel Chat Bridge',
    category: 'communication',
    difficulty: 'advanced',
    description: 'Relays messages between different chat channels.',
    code: `default {
    state_entry() {
        llListen(1, "", NULL_KEY, "");
        llListen(2, "", NULL_KEY, "");
    }
    listen(integer c, string n, key id, string msg) {
        llSay(0, "["+(string)c+"] "+msg);
    }
}`,
    explanation: 'Bridges communication between channels.',
    use_cases: 'Admin tools',
    mistakes: 'Looping messages infinitely.',
    tags: ['advanced', 'communication', 'bridge']
  },
  {
    title: 'Gesture Activated Object Toggle',
    category: 'interaction',
    difficulty: 'intermediate',
    description: 'Listens for a keyword in chat and toggles object visibility.',
    code: `integer channel = 0;
default {
    state_entry() { llListen(channel, "", NULL_KEY, ""); }
    listen(integer c, string n, key id, string msg) {
        if (msg == "toggle") {
            llSetAlpha(llGetAlpha(ALL_SIDES) == 1.0 ? 0.0 : 1.0, ALL_SIDES);
        }
    }
}`,
    explanation: 'Uses chat input to toggle object transparency.',
    use_cases: 'Hidden doors, magic effects',
    mistakes: 'Using public chat unintentionally.',
    tags: ['intermediate', 'interaction', 'toggle']
  },
  {
    title: 'Region Welcome Notecard Giver',
    category: 'inventory',
    difficulty: 'beginner',
    description: 'Automatically gives a notecard to avatars entering range.',
    code: `default {
    state_entry() { llSensorRepeat("", NULL_KEY, AGENT, 15.0, PI, 10.0); }
    sensor(integer n) {
        llGiveInventory(llDetectedKey(0), "Welcome Note");
    }
}`,
    explanation: 'Detects avatars and sends inventory items.',
    use_cases: 'Orientation areas',
    mistakes: 'Spamming users repeatedly.',
    tags: ['beginner', 'inventory', 'notecard']
  },
  {
    title: 'Object Health System',
    category: 'gameplay',
    difficulty: 'intermediate',
    description: 'Tracks and reduces health when object is clicked.',
    code: `integer health = 100;
default {
    touch_start(integer total_number) {
        health -= 10;
        llSay(0, "Health: " + (string)health);
    }
}`,
    explanation: 'Simple health reduction mechanic.',
    use_cases: 'Combat systems',
    mistakes: 'Not preventing negative values.',
    tags: ['intermediate', 'gameplay', 'health']
  },
  {
    title: 'Teleport Pad with Cooldown',
    category: 'movement',
    difficulty: 'advanced',
    description: 'Teleports users but enforces a cooldown timer.',
    code: `integer ready = TRUE;
default {
    touch_start(integer total_number) {
        if (ready) {
            ready = FALSE;
            llSay(0, "Teleporting...");
            llSetTimerEvent(10.0);
        }
    }
    timer() { ready = TRUE; llSetTimerEvent(0.0); }
}`,
    explanation: 'Prevents spam teleporting using timer reset.',
    use_cases: 'Games, hubs',
    mistakes: 'Forgetting to reset timer.',
    tags: ['advanced', 'movement', 'teleport']
  },
  {
    title: 'Animated Color Pulse Effect',
    category: 'visual',
    difficulty: 'intermediate',
    description: 'Cycles colors smoothly over time.',
    code: `float t;
default {
    state_entry() { llSetTimerEvent(0.2); }
    timer() {
        t += 0.1;
        llSetColor(<llFabs(llSin(t)),0.5,1.0>, ALL_SIDES);
    }
}`,
    explanation: 'Uses sine wave for smooth color animation.',
    use_cases: 'Decor, clubs',
    mistakes: 'Too fast timer causing lag.',
    tags: ['intermediate', 'visual', 'pulse']
  },
  {
    title: 'Owner-Only Command Console',
    category: 'security',
    difficulty: 'intermediate',
    description: 'Accepts commands only from object owner.',
    code: `default {
    listen(integer c, string n, key id, string msg) {
        if (id == llGetOwner()) llSay(0, "Command accepted");
    }
}`,
    explanation: 'Validates sender before executing.',
    use_cases: 'Admin tools',
    mistakes: 'Not initializing listener.',
    tags: ['intermediate', 'security', 'owner']
  },
  {
    title: 'Object Spin on Collision',
    category: 'physics',
    difficulty: 'intermediate',
    description: 'Applies spin when object collides.',
    code: `default {
    collision_start(integer total_number) {
        llTargetOmega(<1,0,0>, 2.0, 1.0);
    }
}`,
    explanation: 'Triggers rotation on collision.',
    use_cases: 'Games, effects',
    mistakes: 'No stop condition.',
    tags: ['intermediate', 'physics', 'collision']
  },
  {
    title: 'Dynamic Name Tag Display',
    category: 'ui',
    difficulty: 'beginner',
    description: 'Displays avatar name when touched.',
    code: `default {
    touch_start(integer total_number) {
        llSetText(llDetectedName(0), <1,1,1>,1.0);
    }
}`,
    explanation: 'Uses detected name for UI display.',
    use_cases: 'Events, networking',
    mistakes: 'Overwriting existing text.',
    tags: ['beginner', 'ui', 'name-tag']
  },
  {
    title: 'Object Self-Destruct Timer',
    category: 'utility',
    difficulty: 'intermediate',
    description: 'Deletes object after countdown.',
    code: `default {
    state_entry() { llSetTimerEvent(10.0); }
    timer() { llDie(); }
}`,
    explanation: 'Removes object using llDie.',
    use_cases: 'Temporary objects',
    mistakes: 'Destroying important objects accidentally.',
    tags: ['intermediate', 'utility', 'timer']
  },
  {
    title: 'Weather Simulation Trigger',
    category: 'environment',
    difficulty: 'advanced',
    description: 'Simulates rain effect using particles.',
    code: `default {
    state_entry() {
        llParticleSystem([PSYS_SRC_PATTERN, PSYS_SRC_PATTERN_DROP]);
    }
}`,
    explanation: 'Uses particle system for environmental effect.',
    use_cases: 'Scenes, roleplay',
    mistakes: 'High particle count causing lag.',
    tags: ['advanced', 'environment', 'particles']
  },
  {
    title: 'Basic Door Open/Close Toggle',
    category: 'movement',
    difficulty: 'beginner',
    description: 'Opens and closes a door by rotating it when touched.',
    code: `integer open = FALSE;
default {
    touch_start(integer total_number) {
        open = !open;
        if (open) llSetRot(llEuler2Rot(<0,0,1.57>));
        else llSetRot(llEuler2Rot(<0,0,0>));
    }
}`,
    explanation: 'Uses a toggle to rotate object between two states.',
    use_cases: 'Doors, gates',
    mistakes: 'Incorrect rotation values.',
    tags: ['beginner', 'movement', 'door']
  },
  {
    title: 'Simple Visitor Counter',
    category: 'utility',
    difficulty: 'beginner',
    description: 'Counts how many times the object has been touched.',
    code: `integer visits = 0;
default {
    touch_start(integer total_number) {
        visits++;
        llSay(0, "Visits: " + (string)visits);
    }
}`,
    explanation: 'Increments counter on each interaction.',
    use_cases: 'Tracking engagement',
    mistakes: 'Not resetting counter.',
    tags: ['beginner', 'utility', 'counter']
  },
  {
    title: 'Auto Object Resizer',
    category: 'utility',
    difficulty: 'intermediate',
    description: 'Scales an object up slightly each time it is touched.',
    code: `default {
    touch_start(integer total_number) {
        vector size = llGetScale();
        llSetScale(size + <0.1,0.1,0.1>);
    }
}`,
    explanation: 'Reads current scale and increases it.',
    use_cases: 'Interactive props',
    mistakes: 'Exceeding max object size.',
    tags: ['intermediate', 'utility', 'resize']
  },
  {
    title: 'Touch to Glow Effect',
    category: 'visual',
    difficulty: 'beginner',
    description: 'Applies glow effect when touched.',
    code: `default {
    touch_start(integer total_number) {
        llSetPrimitiveParams([PRIM_GLOW, ALL_SIDES, 0.3]);
    }
}`,
    explanation: 'Uses PRIM_GLOW parameter.',
    use_cases: 'Highlight effects',
    mistakes: 'Forgetting to reset glow.',
    tags: ['beginner', 'visual', 'glow']
  },
  {
    title: 'Random Teleport Within Region',
    category: 'movement',
    difficulty: 'intermediate',
    description: 'Moves object to a random position nearby.',
    code: `default {
    touch_start(integer total_number) {
        vector pos = llGetPos();
        vector rand = <llFrand(5), llFrand(5), 0>;
        llSetPos(pos + rand);
    }
}`,
    explanation: 'Adds random offset to position.',
    use_cases: 'Games, effects',
    mistakes: 'Teleporting into other objects.',
    tags: ['intermediate', 'movement', 'random']
  },
  {
    title: 'Simple Timer Reset Button',
    category: 'utility',
    difficulty: 'beginner',
    description: 'Resets a timer when touched.',
    code: `default {
    touch_start(integer total_number) {
        llResetTime();
        llSay(0, "Timer reset");
    }
}`,
    explanation: 'Uses built-in timer reset.',
    use_cases: 'Timers, tracking',
    mistakes: 'Not displaying updated time.',
    tags: ['beginner', 'utility', 'timer']
  },
  {
    title: 'Basic Sound Loop Player',
    category: 'audio',
    difficulty: 'intermediate',
    description: 'Continuously loops a sound.',
    code: `default {
    state_entry() {
        llLoopSound("sound_uuid", 1.0);
    }
}`,
    explanation: 'Loops audio playback.',
    use_cases: 'Ambience',
    mistakes: 'Missing sound asset.',
    tags: ['intermediate', 'audio', 'loop']
  },
  {
    title: 'Touch-Based Object Hider',
    category: 'interaction',
    difficulty: 'beginner',
    description: 'Hides object when touched.',
    code: `default {
    touch_start(integer total_number) {
        llSetAlpha(0.0, ALL_SIDES);
    }
}`,
    explanation: 'Sets transparency to invisible.',
    use_cases: 'Magic tricks',
    mistakes: 'No way to restore visibility.',
    tags: ['beginner', 'interaction', 'visibility']
  },
  {
    title: 'Auto Rotation Reverser',
    category: 'movement',
    difficulty: 'intermediate',
    description: 'Reverses rotation direction every few seconds.',
    code: `integer dir = 1;
default {
    state_entry() { llSetTimerEvent(3.0); }
    timer() {
        dir *= -1;
        llTargetOmega(<0,0,dir>,1.0,1.0);
    }
}`,
    explanation: 'Flips rotation direction using multiplier.',
    use_cases: 'Displays',
    mistakes: 'Too frequent updates.',
    tags: ['intermediate', 'movement', 'rotation']
  },
  {
    title: 'Basic Collision Counter',
    category: 'gameplay',
    difficulty: 'intermediate',
    description: 'Counts number of collisions.',
    code: `integer hits;
default {
    collision_start(integer total_number) {
        hits++;
        llSay(0, "Hits: " + (string)hits);
    }
}`,
    explanation: 'Tracks collisions.',
    use_cases: 'Games',
    mistakes: 'Ignoring collision filtering.',
    tags: ['intermediate', 'gameplay', 'collision']
  },
  {
    title: 'Touch to Reset Script',
    category: 'utility',
    difficulty: 'beginner',
    description: 'Resets the script when touched.',
    code: `default {
    touch_start(integer total_number) {
        llResetScript();
    }
}`,
    explanation: 'Restarts script execution.',
    use_cases: 'Debugging',
    mistakes: 'Reset loops.',
    tags: ['beginner', 'utility', 'reset']
  },
  {
    title: 'Basic Floating Animation',
    category: 'visual',
    difficulty: 'intermediate',
    description: 'Moves object up and down smoothly.',
    code: `float t;
default {
    state_entry() { llSetTimerEvent(0.2); }
    timer() {
        t += 0.1;
        llSetPos(llGetPos() + <0,0,llSin(t)*0.05>);
    }
}`,
    explanation: 'Uses sine wave for motion.',
    use_cases: 'Floating objects',
    mistakes: 'Drifting position over time.',
    tags: ['intermediate', 'visual', 'animation']
  },
  {
    title: 'Touch Sound Toggle',
    category: 'audio',
    difficulty: 'intermediate',
    description: 'Toggles sound on/off.',
    code: `integer playing;
default {
    touch_start(integer total_number) {
        playing = !playing;
        if (playing) llLoopSound("sound_uuid",1.0);
        else llStopSound();
    }
}`,
    explanation: 'Switches sound state.',
    use_cases: 'Music players',
    mistakes: 'Forgetting stop function.',
    tags: ['intermediate', 'audio', 'toggle']
  },
  {
    title: 'Basic Object Bounce',
    category: 'physics',
    difficulty: 'intermediate',
    description: 'Applies upward force when touched.',
    code: `default {
    touch_start(integer total_number) {
        llApplyImpulse(<0,0,5>, FALSE);
    }
}`,
    explanation: 'Uses impulse for movement.',
    use_cases: 'Games',
    mistakes: 'Requires physics enabled.',
    tags: ['intermediate', 'physics', 'impulse']
  }
];

async function seedLSLScripts() {
  const admin = await get('SELECT id FROM users WHERE is_admin = true ORDER BY id ASC LIMIT 1');
  const authorId = admin?.id || 1;

  for (const script of lslScripts) {
    const existing = await get('SELECT id FROM scripts WHERE LOWER(title) = LOWER($1)', [script.title]);

    if (existing?.id) {
      await run(
        `UPDATE scripts
         SET description = $1,
             category = $2,
             language = $3,
             author_id = $4,
             code = $5,
             explanation = $6,
             use_cases = $7,
             common_mistakes = $8,
             price_tier = $9,
             tags = $10
         WHERE id = $11`,
        [
          `${script.description} ${createdBy}`,
          script.category,
          'LSL',
          authorId,
          script.code,
          `${script.explanation} ${createdBy}`,
          script.use_cases,
          script.mistakes,
          'free',
          script.tags,
          existing.id
        ]
      );
      continue;
    }

    await run(
      `INSERT INTO scripts (title, description, category, language, author_id, code, explanation, use_cases, common_mistakes, price_tier, tags, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        script.title,
        `${script.description} ${createdBy}`,
        script.category,
        'LSL',
        authorId,
        script.code,
        `${script.explanation} ${createdBy}`,
        script.use_cases,
        script.mistakes,
        'free',
        script.tags
      ]
    );
  }

  console.log(`Seeded ${lslScripts.length} LSL scripts.`);
}

seedLSLScripts().catch((error) => {
  console.error('Failed to seed LSL scripts:', error);
  process.exitCode = 1;
});
