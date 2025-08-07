// src/modules/weather.ts
import { AppMode } from '../types';

// Add the 'export' keyword here
export interface WeatherArgs {
  location: string;
  suggested_mode: AppMode;
}

/**
 * Mock function for the Weather/Light module.
 * In a real app, this would call a weather API.
 */
export function getWeatherAndLight(args: WeatherArgs): object {
  // ... rest of the function is unchanged
  console.log(`[Weather Module]: Called with args: ${JSON.stringify(args)}`);
  const result = {
    status: 'success',
    location: args.location,
    temperature: '18°C',
    condition: 'Partly Cloudy',
    light_level: 'Bright daylight, good visibility.',
  };
  
  console.log(`[Weather Module]: Result: ${JSON.stringify(result)}`);
  return result;
}
