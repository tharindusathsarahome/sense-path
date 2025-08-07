// src/samsm-demo.ts
import * as dotenv from 'dotenv';
// EXECUTE THIS FIRST!
dotenv.config();

// Now, import other modules. By this point, process.env is populated.
import { analyzeAndAct } from './samsm';

async function main() {
  // Your check here is good, but it runs too late to prevent the crash.
  // It's still useful as a safeguard.
  if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is not set. Please create a .env file and ensure it's loaded correctly.");
    process.exit(1);
  }

  console.log("=============================================");
  console.log("=== Starting SensePath Core Demonstration ===");
  console.log("=============================================\n");

  const userPrompts = [
    "I need to get to the main train station.",
    "What's the weather like in London right now? I need to know if I need a jacket.",
    "Describe what's in front of me.",
    "Who is that person over there?",
    "Okay, let's go to the nearest coffee shop, I'll walk."
  ];

  for (const prompt of userPrompts) {
    try {
      const { finalResponse, mode } = await analyzeAndAct(prompt, process.env.GEMINI_API_KEY as string);
      
      console.log(`[APP SIMULATOR]`);
      console.log(` -> Final AI Message: ${finalResponse}`);
      console.log(` -> Screen Mode set to: ${mode.toUpperCase()}`);
      console.log("--------------------------------------------\n");
    } catch (error) {
      console.error(`An error occurred while processing prompt: "${prompt}"`, error);
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}
