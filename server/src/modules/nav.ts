import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';
import axios, { AxiosResponse } from 'axios';
import * as readline from 'readline';

// --- SETUP INSTRUCTIONS ---
// 1. Get a Google Cloud API Key (enable Directions API and Places API):
//    https://console.cloud.google.com/apis/credentials
// 2. Get an OpenWeatherMap API Key:
//    https://openweathermap.org/api
// 3. Install dependencies:
//    npm install @googlemaps/google-maps-services-js axios @types/node
//    npm install -D typescript ts-node

// --- CONFIGURATION ---
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// --- INTERFACES ---
interface WeatherData {
    weather: Array<{
        description: string;
        main: string;
    }>;
    main: {
        temp: number;
        humidity: number;
    };
}

interface PlacesResponse {
    results: Array<{
        name: string;
        place_id: string;
        rating?: number;
    }>;
    status: string;
}

// --- UTILITY FUNCTIONS ---
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const getUserInput = (question: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
};

const cleanHtmlInstructions = (htmlText: string): string => {
    return htmlText.replace(/<[^<]+?>/g, '');
};

// --- MAIN EXECUTION ---
async function main(): Promise<void> {
    try {
        // --- USER INPUT ---
        console.log("Testing with sample locations...");
        const origin = "Alawwa"; // More specific test input
        const destination = "Colombo"; // More specific test input
        
        console.log(`From: ${origin}`);
        console.log(`To: ${destination}`);

        // --- GOOGLE MAPS CLIENT ---
        const gmaps = new GoogleMapsClient({});

        // --- GET DIRECTIONS ---
        console.log("Requesting directions from Google Maps API...");
        const directionsResponse = await gmaps.directions({
            params: {
                origin: origin,
                destination: destination,
                key: GOOGLE_API_KEY
            } as any
        });

        const directionsResult = directionsResponse.data;
        
        console.log("API Response Status:", directionsResult.status);
        console.log("Available Routes:", directionsResult.routes?.length || 0);

        if (!directionsResult.routes || directionsResult.routes.length === 0) {
            console.log("No routes found!");
            console.log("Full API response:", JSON.stringify(directionsResult, null, 2));
            return;
        }

        const route = directionsResult.routes[0];
        const leg = route.legs[0];

        // --- PRINT ROUTE SUMMARY ---
        console.log("\nRoute Steps:");
        leg.steps.forEach((step) => {
            const cleanInstruction = cleanHtmlInstructions(step.html_instructions);
            console.log(`- ${cleanInstruction} | ${step.distance.text}`);
        });

        // --- TRAFFIC/OBSTACLE INFO ---
        const durationWithTraffic = leg.duration_in_traffic?.text || 'N/A';
        console.log(`\nEstimated Duration (with traffic): ${durationWithTraffic}`);

        // --- WEATHER INFO ---
        const getWeather = async (lat: number, lng: number): Promise<[string, number | string]> => {
            try {
                const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric`;
                const response: AxiosResponse<WeatherData> = await axios.get(url);
                const data = response.data;

                if (data.weather && data.main) {
                    return [data.weather[0].description, data.main.temp];
                } else {
                    return ['Unavailable', 'N/A'];
                }
            } catch (error) {
                console.error('Weather API error:', error);
                return ['Unavailable', 'N/A'];
            }
        };

        const startLoc = leg.start_location;
        const endLoc = leg.end_location;

        const [startWeather, startTemp] = await getWeather(startLoc.lat, startLoc.lng);
        const [endWeather, endTemp] = await getWeather(endLoc.lat, endLoc.lng);

        console.log(`\nWeather at origin: ${startWeather}, ${startTemp}°C`);
        console.log(`Weather at destination: ${endWeather}, ${endTemp}°C`);

        // --- SAFE ZONE DETECTION (e.g., hospitals, police stations) ---
        const findSafeZones = async (lat: number, lng: number, placeType: string): Promise<string[]> => {
            try {
                const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=${placeType}&key=${GOOGLE_API_KEY}`;
                const response: AxiosResponse<PlacesResponse> = await axios.get(url);
                const data = response.data;
                
                return data.results?.map(place => place.name) || [];
            } catch (error) {
                console.error(`Error finding ${placeType}s:`, error);
                return [];
            }
        };

        const safeTypes: string[] = ['hospital', 'police'];
        console.log("\nSafe Zones near destination:");
        
        for (const type of safeTypes) {
            const zones = await findSafeZones(endLoc.lat, endLoc.lng, type);
            const zonesList = zones.length > 0 ? zones.join(', ') : 'None found';
            console.log(`  ${type.charAt(0).toUpperCase() + type.slice(1)}s: ${zonesList}`);
        }

        // --- PRINT RAW DATA (OPTIONAL) ---
        // console.log('\nRaw Directions Data:');
        // console.log(JSON.stringify(directionsResult, null, 2));

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        rl.close();
    }
}

// Run the main function
main().catch(console.error);
// Run code in terminal:
// npx ts-node src/modules/nav.ts