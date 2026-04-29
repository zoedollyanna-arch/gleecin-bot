/**
 * Seed Script - Real LSL Scripts
 * Populates the database with beginner-friendly Linden Scripting Language examples
 * Run with: node website/seed-scripts.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const lslScripts = [
  {
    title: "Hello World - Basic Script",
    description: "The classic Hello World script for beginners. This is the first script every LSL programmer should learn.",
    category: "beginner",
    language: "LSL",
    code: `// Hello World Script
// This is the most basic LSL script

default
{
    state_entry()
    {
        llSay(0, "Hello, World!");
    }
    
    touch_start(integer total_number)
    {
        llSay(0, "Hello, " + llDetectedName(0) + "!");
    }
}`,
    explanation: "This script demonstrates the basic structure of an LSL script. The state_entry() event runs when the script is first loaded or reset. The touch_start() event runs when someone touches the object.",
    use_cases: "Learning basic script structure, greeting systems, interactive objects",
    common_mistakes: "Forgetting to include the default state block, misspelling event names, not using proper semicolons",
    price_tier: "free",
    tags: ["beginner", "hello-world", "basic", "tutorial"]
  },
  {
    title: "Simple Rotation Script",
    description: "Makes an object rotate continuously at a set speed. Great for rotating decorations, signs, or animated displays.",
    category: "movement",
    language: "LSL",
    code: `// Simple Rotation Script
// Rotates the object continuously

float rotationSpeed = 0.05; // Adjust this value for faster/slower rotation

default
{
    state_entry()
    {
        llTargetOmega(<0, 0, 1>, rotationSpeed, 1.0);
    }
    
    touch_start(integer total_number)
    {
        // Toggle rotation on touch
        llTargetOmega(<0, 0, 1>, rotationSpeed, 1.0);
    }
}`,
    explanation: "Uses llTargetOmega to create smooth rotation. The vector <0, 0, 1> means rotation around the Z-axis (vertical). The second parameter is rotation speed, and the third is gain (1.0 = full strength).",
    use_cases: "Rotating signs, spinning decorations, animated displays, windmills",
    common_mistakes: "Using wrong axis vector, setting speed too high (causes jitter), not setting gain properly",
    price_tier: "free",
    tags: ["rotation", "movement", "animation", "beginner"]
  },
  {
    title: "Floating Text Script",
    description: "Displays floating text above an object. Useful for signs, labels, and information displays.",
    category: "text",
    language: "LSL",
    code: `// Floating Text Script
// Displays text above the object

string displayText = "Welcome!";
vector textColor = <1, 1, 1>; // White color (RGB)
float alpha = 1.0; // Opacity (1.0 = fully opaque)

default
{
    state_entry()
    {
        llSetText(displayText, textColor, alpha);
    }
    
    touch_start(integer total_number)
    {
        // Cycle through different messages
        string messages = ["Welcome!", "Hello!", "Greetings!", "Click me!"];
        integer index = (integer)llFrand(llGetListLength(messages));
        displayText = llList2String(messages, index);
        llSetText(displayText, textColor, alpha);
    }
}`,
    explanation: "llSetText displays floating text above the object. The color is an RGB vector where each component is 0-1. Alpha controls transparency (0 = invisible, 1 = fully visible).",
    use_cases: "Store signs, information labels, welcome messages, interactive displays",
    common_mistakes: "Using RGB values outside 0-1 range, forgetting to set alpha, not updating text after changes",
    price_tier: "free",
    tags: ["text", "display", "signs", "beginner"]
  },
  {
    title: "Basic Particle System",
    description: "Creates a simple particle effect when the object is touched. Great for magical effects, fireworks, or visual feedback.",
    category: "effects",
    language: "LSL",
    code: `// Basic Particle System
// Creates particles on touch

default
{
    touch_start(integer total_number)
    {
        llParticleSystem([
            PSYS_PART_FLAGS, PSYS_PART_EMISSIVE,
            PSYS_SRC_PATTERN, PSYS_SRC_PATTERN_EXPLODE,
            PSYS_PART_START_COLOR, <1, 0, 0>, // Red
            PSYS_PART_END_COLOR, <1, 1, 0>, // Yellow
            PSYS_PART_START_ALPHA, 1.0,
            PSYS_PART_END_ALPHA, 0.0,
            PSYS_PART_START_SCALE, <0.1, 0.1, 0.1>,
            PSYS_PART_END_SCALE, <0.5, 0.5, 0.5>,
            PSYS_PART_MAX_AGE, 2.0,
            PSYS_SRC_BURST_RATE, 0.1,
            PSYS_SRC_BURST_PART_COUNT, 50,
            PSYS_SRC_ACCEL, <0, 0, 0.5>,
            PSYS_SRC_BURST_RADIUS, 0.5,
            PSYS_SRC_MAX_AGE, 0.5
        ]);
        
        // Clear particles after 2 seconds
        llSetTimerEvent(2.0);
    }
    
    timer()
    {
        llParticleSystem([]);
        llSetTimerEvent(0.0);
    }
}`,
    explanation: "Particle systems use llParticleSystem with a list of parameters. This creates an explosion pattern with red-to-yellow particles that fade out. The timer clears the particles after 2 seconds.",
    use_cases: "Magical effects, fireworks, visual feedback, celebration effects",
    common_mistakes: "Not clearing particles (causes lag), using too many particles, incorrect parameter order",
    price_tier: "free",
    tags: ["particles", "effects", "visual", "intermediate"]
  },
  {
    title: "Door Script - Simple",
    description: "A basic door that opens when touched and closes automatically after a delay. Perfect for buildings and rooms.",
    category: "building",
    language: "LSL",
    code: `// Simple Door Script
// Opens on touch, closes automatically

float closeDelay = 5.0; // Seconds before auto-close
vector openPosition = <0, 1, 0>; // Position offset when open
rotation openRotation = <0, 0, 0, 1>; // No rotation when open

integer isOpen = FALSE;

default
{
    state_entry()
    {
        isOpen = FALSE;
    }
    
    touch_start(integer total_number)
    {
        if (!isOpen)
        {
            // Open the door
            llSetPos(llGetPos() + openPosition);
            llSetRot(openRotation);
            isOpen = TRUE;
            
            // Set timer to close
            llSetTimerEvent(closeDelay);
        }
        else
        {
            // Close immediately if touched while open
            llSetTimerEvent(0.0);
            closeDoor();
        }
    }
    
    timer()
    {
        closeDoor();
        llSetTimerEvent(0.0);
    }
    
    closeDoor()
    {
        // Return to original position
        llSetPos(llGetPos() - openPosition);
        isOpen = FALSE;
    }
}`,
    explanation: "This door uses position offset to open/close. When touched, it moves to the open position and sets a timer. If not touched again, it closes automatically after the delay.",
    use_cases: "Building doors, gates, hatches, secret passages",
    common_mistakes: "Wrong position offset, not tracking door state, timer conflicts",
    price_tier: "free",
    tags: ["door", "building", "movement", "beginner"]
  },
  {
    title: "Color Change Script",
    description: "Changes the object's color when touched. Cycles through a predefined list of colors.",
    category: "appearance",
    language: "LSL",
    code: `// Color Change Script
// Cycles through colors on touch

list colors = [
    <1, 0, 0>,    // Red
    <0, 1, 0>,    // Green
    <0, 0, 1>,    // Blue
    <1, 1, 0>,    // Yellow
    <1, 0, 1>,    // Magenta
    <0, 1, 1>,    // Cyan
    <1, 1, 1>     // White
];

integer colorIndex = 0;

default
{
    state_entry()
    {
        llSetColor(llList2Vector(colors, 0), ALL_SIDES);
    }
    
    touch_start(integer total_number)
    {
        colorIndex = (colorIndex + 1) % llGetListLength(colors);
        vector newColor = llList2Vector(colors, colorIndex);
        llSetColor(newColor, ALL_SIDES);
        
        // Announce the color
        string colorName = llList2String(["Red", "Green", "Blue", "Yellow", "Magenta", "Cyan", "White"], colorIndex);
        llSay(0, "Color changed to: " + colorName);
    }
}`,
    explanation: "Uses a list of RGB color vectors. The modulo operator (%) ensures we cycle back to the first color after reaching the end. ALL_SIDES applies the color to all faces of the prim.",
    use_cases: "Color-changing objects, mood lighting, interactive decorations, color-coded systems",
    common_mistakes: "RGB values outside 0-1 range, not using ALL_SIDES correctly, list index errors",
    price_tier: "free",
    tags: ["color", "appearance", "interactive", "beginner"]
  },
  {
    title: "Sound Player Script",
    description: "Plays a sound when the object is touched. Can be used for doorbells, alarms, or interactive sound effects.",
    category: "audio",
    language: "LSL",
    code: `// Sound Player Script
// Plays a sound on touch

string soundName = "doorbell"; // Name of sound in inventory
float volume = 1.0; // Volume (0.0 to 1.0)

default
{
    state_entry()
    {
        // Check if sound exists in inventory
        if (llGetInventoryType(soundName) != INVENTORY_SOUND)
        {
            llSay(0, "Error: Sound '" + soundName + "' not found in inventory");
        }
    }
    
    touch_start(integer total_number)
    {
        llPlaySound(soundName, volume);
    }
    
    changed(integer change)
    {
        if (change & CHANGED_INVENTORY)
        {
            // Re-check when inventory changes
            if (llGetInventoryType(soundName) != INVENTORY_SOUND)
            {
                llSay(0, "Error: Sound '" + soundName + "' not found in inventory");
            }
        }
    }
}`,
    explanation: "llPlaySound plays a sound from the object's inventory. The volume parameter ranges from 0.0 (silent) to 1.0 (maximum). The script checks if the sound exists before playing.",
    use_cases: "Doorbells, alarms, interactive sound effects, ambient sounds",
    common_mistakes: "Sound not in inventory, volume outside 0-1 range, not checking inventory type",
    price_tier: "free",
    tags: ["sound", "audio", "interactive", "beginner"]
  },
  {
    title: "Light Script - Point Light",
    description: "Creates a point light that illuminates the surrounding area. Useful for lamps, torches, and atmospheric lighting.",
    category: "lighting",
    language: "LSL",
    code: `// Point Light Script
// Creates a light source

vector lightColor = <1, 1, 0.8>; // Warm white
float intensity = 1.0; // Light intensity (0-1)
float radius = 10.0; // Light radius in meters
float falloff = 0.5; // Light falloff (0-1)

integer isLightOn = FALSE;

default
{
    state_entry()
    {
        // Light starts off
        llSetPrimitiveParams([PRIM_POINT_LIGHT, FALSE, lightColor, intensity, radius, falloff]);
    }
    
    touch_start(integer total_number)
    {
        isLightOn = !isLightOn;
        
        if (isLightOn)
        {
            llSetPrimitiveParams([PRIM_POINT_LIGHT, TRUE, lightColor, intensity, radius, falloff]);
            llSay(0, "Light turned ON");
        }
        else
        {
            llSetPrimitiveParams([PRIM_POINT_LIGHT, FALSE, lightColor, intensity, radius, falloff]);
            llSay(0, "Light turned OFF");
        }
    }
}`,
    explanation: "Uses PRIM_POINT_LIGHT parameter to control lighting. The color is RGB (0-1), intensity is brightness (0-1), radius is how far the light reaches, and falloff controls how quickly it dims.",
    use_cases: "Lamps, torches, street lights, atmospheric lighting, mood lighting",
    common_mistakes: "RGB values outside 0-1, intensity/radius too high (causes lag), not toggling correctly",
    price_tier: "free",
    tags: ["light", "lighting", "atmosphere", "beginner"]
  },
  {
    title: "Sit Target Script",
    description: "Sets a sit position and rotation for an object. Essential for chairs, benches, and any sittable furniture.",
    category: "furniture",
    language: "LSL",
    code: `// Sit Target Script
// Sets where avatars sit on the object

vector sitPosition = <0, 0, 0.5>; // Sit position (offset from center)
rotation sitRotation = <0, 0, 0, 1>; // Sit rotation (no rotation)

default
{
    state_entry()
    {
        llSitTarget(sitPosition, sitRotation);
    }
    
    changed(integer change)
    {
        if (change & CHANGED_LINK)
        {
            key avatar = llAvatarOnSitTarget();
            
            if (avatar != NULL_KEY)
            {
                // Someone sat down
                llSay(0, "Welcome! Sit back and relax.");
            }
            else
            {
                // Someone stood up
                llSay(0, "Thanks for visiting!");
            }
        }
    }
}`,
    explanation: "llSitTarget defines where an avatar sits relative to the object's center. The position is an offset vector, and rotation uses quaternion format. The changed event detects when someone sits or stands.",
    use_cases: "Chairs, benches, sofas, any sittable furniture",
    common_mistakes: "Wrong sit position (avatar floats or sinks), incorrect rotation format, not handling changed event",
    price_tier: "free",
    tags: ["sit", "furniture", "avatar", "beginner"]
  },
  {
    title: "Notecard Giver Script",
    description: "Gives a notecard to anyone who touches the object. Perfect for information dispensers, welcome packets, and item distribution.",
    category: "inventory",
    language: "LSL",
    code: `// Notecard Giver Script
// Gives a notecard on touch

string notecardName = "Welcome Information";

default
{
    state_entry()
    {
        // Check if notecard exists
        if (llGetInventoryType(notecardName) != INVENTORY_NOTECARD)
        {
            llSay(0, "Error: Notecard '" + notecardName + "' not found in inventory");
        }
    }
    
    touch_start(integer total_number)
    {
        key avatar = llDetectedKey(0);
        
        if (llGetInventoryType(notecardName) == INVENTORY_NOTECARD)
        {
            llGiveInventory(avatar, notecardName);
            llSay(0, "Here is your information, " + llDetectedName(0) + "!");
        }
        else
        {
            llSay(0, "Sorry, the information is not available right now.");
        }
    }
    
    changed(integer change)
    {
        if (change & CHANGED_INVENTORY)
        {
            // Re-check when inventory changes
            if (llGetInventoryType(notecardName) != INVENTORY_NOTECARD)
            {
                llSay(0, "Error: Notecard '" + notecardName + "' not found in inventory");
            }
        }
    }
}`,
    explanation: "llGiveInventory gives an item from the object's inventory to an avatar. The script checks if the notecard exists before attempting to give it, and provides feedback to the user.",
    use_cases: "Information dispensers, welcome packets, item distribution, product documentation",
    common_mistakes: "Item not in inventory, wrong inventory type check, not using llDetectedKey correctly",
    price_tier: "free",
    tags: ["notecard", "inventory", "distribution", "beginner"]
  }
];

async function seedScripts() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting LSL script seeding...\n');

    // Get admin user ID
    const adminResult = await client.query('SELECT id FROM users WHERE is_admin = true LIMIT 1');
    const adminId = adminResult.rows[0]?.id || 1;

    for (const script of lslScripts) {
      try {
        const result = await client.query(
          `INSERT INTO scripts (title, description, category, language, author_id, code, explanation, 
           use_cases, common_mistakes, price_tier, tags, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
           RETURNING id`,
          [
            script.title,
            script.description,
            script.category,
            script.language,
            adminId,
            script.code,
            script.explanation,
            script.use_cases,
            script.common_mistakes,
            script.price_tier,
            script.tags
          ]
        );

        console.log(`✅ Seeded: ${script.title}`);
      } catch (error) {
        console.error(`❌ Failed to seed ${script.title}:`, error.message);
      }
    }

    console.log('\n✨ LSL script seeding complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

seedScripts().catch(console.error).finally(() => process.exit(0));
