// src/types.ts
/**
 * Defines the operational modes of the SensePath application.
 * The AI will select one of these modes based on context, and this
 * can be used to update the UI on the mobile app.
 */
export type AppMode = 
  | 'navigation'    // When the user is actively getting directions.
  | 'exploration'   // When the user is asking to describe the environment.
  | 'social'        // When the app is focused on face/person recognition.
  | 'weather_check' // When the user is asking about weather or light.
  | 'idle';         // The default or standby state.

/**
 * A generic interface for the arguments passed to our tool functions.
 * It ensures that the AI always suggests an appropriate application mode
 * as part of its function call decision, fulfilling a core project requirement.
 */
export interface SensePathFunctionArgs {
  /** The most appropriate application mode for the requested action. */
  suggested_mode: AppMode;
  
  /** Allows for other function-specific properties. */
  [key: string]: any; 
}
