// src/modules/navigation.ts
import { AppMode } from '../types';
import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';
import axios from 'axios';

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

interface PlacesResponse {
    results: Array<{
        name: string;
        place_id: string;
        rating?: number;
    }>;
    status: string;
}

export interface NavigationArgs {
  destination: string;
  travel_mode: 'walking' | 'transit';
  suggested_mode: AppMode;
  current_location?: {
    latitude: number;
    longitude: number;
  };
}

// Utility functions
const cleanHtmlInstructions = (htmlText: string): string => {
    return htmlText.replace(/<[^<]+?>/g, '');
};

const findSafeZones = async (lat: number, lng: number, placeType: string): Promise<string[]> => {
    try {
        if (!GOOGLE_API_KEY) {
            return [];
        }
        
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=${placeType}&key=${GOOGLE_API_KEY}`;
        const response = await axios.get<PlacesResponse>(url);
        const data = response.data;
        
        return data.results?.map((place: any) => place.name) || [];
    } catch (error) {
        console.error(`Error finding ${placeType}s:`, error);
        return [];
    }
};

/**
 * Enhanced Navigation AI System with Google Maps integration.
 * In a real app, this interfaces with Google Maps API for actual navigation.
 */
export async function startNavigation(args: NavigationArgs): Promise<object> {
  console.log(`[Navigation Module]: Called with args: ${JSON.stringify(args)}`);
  
  // If no current location is provided, return a basic response
  if (!args.current_location) {
    const basicResult = {
      status: 'success',
      message: `Route calculation to ${args.destination} via ${args.travel_mode} has started. Please enable location for detailed navigation.`,
      estimated_time: `${Math.floor(Math.random() * 20) + 5} minutes`,
      current_location: null,
      destination: args.destination,
      travel_mode: args.travel_mode
    };
    
    console.log(`[Navigation Module]: Basic Result: ${JSON.stringify(basicResult)}`);
    return basicResult;
  }

  // Enhanced navigation with Google Maps API
  try {
    if (!GOOGLE_API_KEY) {
      console.warn('[Navigation Module]: Google API key not configured, returning mock response');
      return createMockResponse(args);
    }

    const gmaps = new GoogleMapsClient({});
    const origin = `${args.current_location.latitude},${args.current_location.longitude}`;
    
    console.log(`[Navigation Module]: Getting directions from ${origin} to ${args.destination}`);

    // Get directions from Google Maps
    const directionsResponse = await gmaps.directions({
      params: {
        origin: origin,
        destination: args.destination,
        mode: args.travel_mode as any,
        key: GOOGLE_API_KEY
      } as any
    });

    const directionsResult = directionsResponse.data;
    
    if (!directionsResult.routes || directionsResult.routes.length === 0) {
      console.log('[Navigation Module]: No routes found');
      return {
        status: 'error',
        message: `No routes found from your location to ${args.destination}`,
        current_location: args.current_location,
        destination: args.destination,
        travel_mode: args.travel_mode
      };
    }

    const route = directionsResult.routes[0];
    const leg = route.legs[0];

    // Extract route steps
    const routeSteps = leg.steps.map((step, index) => ({
      step: index + 1,
      instruction: cleanHtmlInstructions(step.html_instructions),
      distance: step.distance.text,
      duration: step.duration.text
    }));

    // Get location information
    const startLoc = leg.start_location;
    const endLoc = leg.end_location;

    // Find safe zones near destination
    const safeTypes: string[] = ['hospital', 'police'];
    const safeZones: Record<string, string[]> = {};
    
    for (const type of safeTypes) {
      const zones = await findSafeZones(endLoc.lat, endLoc.lng, type);
      safeZones[type] = zones.slice(0, 3); // Limit to 3 per type
    }

    // Create comprehensive response
    const enhancedResult = {
      status: 'success',
      message: `Navigation started to ${args.destination}. ${leg.distance.text} journey via ${args.travel_mode}.`,
      estimated_time: leg.duration.text,
      estimated_time_with_traffic: leg.duration_in_traffic?.text || leg.duration.text,
      current_location: args.current_location,
      destination: args.destination,
      travel_mode: args.travel_mode,
      route_summary: {
        total_distance: leg.distance.text,
        total_duration: leg.duration.text,
        start_address: leg.start_address,
        end_address: leg.end_address
      },
      route_steps: routeSteps.slice(0, 5), // First 5 steps
      safe_zones: safeZones,
      navigation_ready: true
    };

    console.log(`[Navigation Module]: Enhanced Result: ${JSON.stringify(enhancedResult, null, 2)}`);
    return enhancedResult;

  } catch (error) {
    console.error('[Navigation Module]: Error with Google Maps API:', error);
    
    // Fallback to mock response with error indication
    const fallbackResult = createMockResponse(args);
    (fallbackResult as any).api_error = true;
    (fallbackResult as any).message += ' (Using offline mode - API error)';
    
    return fallbackResult;
  }
}

/**
 * Creates a mock response when APIs are not available
 */
function createMockResponse(args: NavigationArgs): object {
  let locationInfo = '';
  if (args.current_location) {
    locationInfo = ` from current location (${args.current_location.latitude.toFixed(4)}, ${args.current_location.longitude.toFixed(4)})`;
  }
  
  return {
    status: 'success',
    message: `Route calculation to ${args.destination} via ${args.travel_mode} has started${locationInfo}.`,
    estimated_time: `${Math.floor(Math.random() * 20) + 5} minutes`,
    current_location: args.current_location || null,
    destination: args.destination,
    travel_mode: args.travel_mode,
    mock_response: true
  };
}
