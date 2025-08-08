// src/modules/weather.ts
import { AppMode } from '../types';
import axios, { AxiosResponse } from 'axios';

// Configuration
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

// Interfaces
interface WeatherData {
    weather: Array<{
        description: string;
        main: string;
        id: number;
    }>;
    main: {
        temp: number;
        feels_like: number;
        humidity: number;
        pressure: number;
    };
    visibility: number;
    wind: {
        speed: number;
        deg: number;
    };
    clouds: {
        all: number;
    };
    sys: {
        sunrise: number;
        sunset: number;
    };
    name: string;
    coord: {
        lat: number;
        lon: number;
    };
}

interface UVIndexData {
    value: number;
}

export interface WeatherArgs {
  location?: string;
  suggested_mode: AppMode;
  current_location?: {
    latitude: number;
    longitude: number;
  };
}

// Utility functions
const getLightLevel = (weatherData: WeatherData, uvIndex?: number): string => {
    const currentTime = Date.now() / 1000;
    const sunrise = weatherData.sys.sunrise;
    const sunset = weatherData.sys.sunset;
    const cloudiness = weatherData.clouds.all;
    const visibility = weatherData.visibility;
    
    // Check if it's daytime
    const isDaytime = currentTime >= sunrise && currentTime <= sunset;
    
    if (!isDaytime) {
        return 'Nighttime - low visibility, use caution when navigating.';
    }
    
    let lightDescription = '';
    
    // Assess light based on cloudiness and UV index
    if (cloudiness < 20) {
        lightDescription = 'Bright sunny conditions';
    } else if (cloudiness < 50) {
        lightDescription = 'Partly cloudy with good light';
    } else if (cloudiness < 80) {
        lightDescription = 'Mostly cloudy with moderate light';
    } else {
        lightDescription = 'Overcast with dim light';
    }
    
    // Add UV information if available
    if (uvIndex !== undefined) {
        if (uvIndex >= 8) {
            lightDescription += ', very high UV - use sun protection';
        } else if (uvIndex >= 6) {
            lightDescription += ', high UV - sun protection recommended';
        } else if (uvIndex >= 3) {
            lightDescription += ', moderate UV levels';
        }
    }
    
    // Add visibility information
    const visibilityKm = visibility / 1000;
    if (visibilityKm >= 10) {
        lightDescription += ', excellent visibility for navigation.';
    } else if (visibilityKm >= 5) {
        lightDescription += ', good visibility for navigation.';
    } else if (visibilityKm >= 1) {
        lightDescription += ', limited visibility - proceed with caution.';
    } else {
        lightDescription += ', very poor visibility - navigation may be difficult.';
    }
    
    return lightDescription;
};

const getWeatherByCoordinates = async (lat: number, lon: number): Promise<WeatherData> => {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
    const response: AxiosResponse<WeatherData> = await axios.get(url);
    return response.data;
};

const getWeatherByLocation = async (location: string): Promise<WeatherData> => {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${WEATHER_API_KEY}&units=metric`;
    const response: AxiosResponse<WeatherData> = await axios.get(url);
    return response.data;
};

const getUVIndex = async (lat: number, lon: number): Promise<number | undefined> => {
    try {
        const url = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`;
        const response: AxiosResponse<UVIndexData> = await axios.get(url);
        return response.data.value;
    } catch (error) {
        console.warn('[Weather Module]: Could not fetch UV index:', error);
        return undefined;
    }
};

const getNavigationSafety = (weatherData: WeatherData): { level: string; recommendations: string[] } => {
    const weather = weatherData.weather[0];
    const temp = weatherData.main.temp;
    const windSpeed = weatherData.wind.speed;
    const visibility = weatherData.visibility / 1000; // Convert to km
    
    const recommendations: string[] = [];
    let safetyLevel = 'safe';
    
    // Temperature considerations
    if (temp > 35) {
        safetyLevel = 'caution';
        recommendations.push('Very hot weather - stay hydrated and seek shade');
    } else if (temp < 0) {
        safetyLevel = 'caution';
        recommendations.push('Freezing conditions - watch for ice and dress warmly');
    } else if (temp < 5) {
        recommendations.push('Cold weather - dress appropriately');
    }
    
    // Weather condition considerations
    const weatherId = weather.id;
    if (weatherId >= 200 && weatherId < 300) { // Thunderstorm
        safetyLevel = 'dangerous';
        recommendations.push('Thunderstorm conditions - seek indoor shelter immediately');
    } else if (weatherId >= 300 && weatherId < 600) { // Drizzle/Rain
        if (safetyLevel !== 'dangerous') safetyLevel = 'caution';
        recommendations.push('Wet conditions - use caution, surfaces may be slippery');
    } else if (weatherId >= 600 && weatherId < 700) { // Snow
        safetyLevel = 'caution';
        recommendations.push('Snow conditions - very slippery surfaces, walk carefully');
    } else if (weatherId >= 700 && weatherId < 800) { // Atmosphere (fog, mist, etc)
        if (visibility < 1) {
            safetyLevel = 'dangerous';
            recommendations.push('Very poor visibility - avoid navigation if possible');
        } else {
            safetyLevel = 'caution';
            recommendations.push('Reduced visibility due to atmospheric conditions');
        }
    }
    
    // Wind considerations
    if (windSpeed > 15) { // > 54 km/h
        safetyLevel = 'dangerous';
        recommendations.push('Very strong winds - avoid outdoor navigation');
    } else if (windSpeed > 10) { // > 36 km/h
        if (safetyLevel !== 'dangerous') safetyLevel = 'caution';
        recommendations.push('Strong winds - be extra careful outdoors');
    }
    
    // Visibility considerations
    if (visibility < 0.5) {
        safetyLevel = 'dangerous';
        recommendations.push('Extremely poor visibility - avoid navigation');
    } else if (visibility < 2) {
        if (safetyLevel !== 'dangerous') safetyLevel = 'caution';
        recommendations.push('Poor visibility - use extra caution');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('Good conditions for navigation');
    }
    
    return { level: safetyLevel, recommendations };
};

/**
 * Enhanced Weather/Light module with real weather API integration.
 * Provides comprehensive weather data and navigation safety assessment.
 */
export async function getWeatherAndLight(args: WeatherArgs): Promise<object> {
  console.log(`[Weather Module]: Called with args: ${JSON.stringify(args)}`);
  
  // If no API key is configured, return mock response
  if (!WEATHER_API_KEY) {
    console.warn('[Weather Module]: OpenWeather API key not configured, returning mock response');
    return createMockWeatherResponse(args);
  }

  try {
    let weatherData: WeatherData;
    
    // Try to get weather by coordinates first if available
    if (args.current_location) {
      console.log(`[Weather Module]: Getting weather for coordinates: ${args.current_location.latitude}, ${args.current_location.longitude}`);
      weatherData = await getWeatherByCoordinates(args.current_location.latitude, args.current_location.longitude);
    } else if (args.location) {
      console.log(`[Weather Module]: Getting weather for location: ${args.location}`);
      weatherData = await getWeatherByLocation(args.location);
    } else {
      // Default to a generic location if neither coordinates nor location string provided
      console.log(`[Weather Module]: No location provided, using default location`);
      weatherData = await getWeatherByLocation('New York, NY');
    }

    // Get UV index if coordinates are available
    let uvIndex: number | undefined;
    if (weatherData.coord) {
      uvIndex = await getUVIndex(weatherData.coord.lat, weatherData.coord.lon);
    }

    // Assess light conditions
    const lightLevel = getLightLevel(weatherData, uvIndex);
    
    // Assess navigation safety
    const safety = getNavigationSafety(weatherData);

    // Create comprehensive response
    const enhancedResult = {
      status: 'success',
      location: weatherData.name || args.location || 'Current Location',
      coordinates: weatherData.coord,
      temperature: `${Math.round(weatherData.main.temp)}°C`,
      feels_like: `${Math.round(weatherData.main.feels_like)}°C`,
      condition: weatherData.weather[0].description,
      weather_main: weatherData.weather[0].main,
      humidity: `${weatherData.main.humidity}%`,
      pressure: `${weatherData.main.pressure} hPa`,
      wind_speed: `${Math.round(weatherData.wind.speed * 3.6)} km/h`, // Convert m/s to km/h
      wind_direction: weatherData.wind.deg,
      visibility: `${Math.round(weatherData.visibility / 1000)} km`,
      cloudiness: `${weatherData.clouds.all}%`,
      uv_index: uvIndex,
      light_level: lightLevel,
      navigation_safety: {
        level: safety.level,
        recommendations: safety.recommendations
      },
      sunrise: new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString(),
      sunset: new Date(weatherData.sys.sunset * 1000).toLocaleTimeString(),
      last_updated: new Date().toISOString(),
      data_source: args.current_location ? 'coordinates' : 'location_name'
    };

    console.log(`[Weather Module]: Enhanced Result: ${JSON.stringify(enhancedResult, null, 2)}`);
    return enhancedResult;

  } catch (error) {
    console.error('[Weather Module]: Error fetching weather data:', error);
    
    // Fallback to mock response with error indication
    const fallbackResult = createMockWeatherResponse(args);
    (fallbackResult as any).api_error = true;
    (fallbackResult as any).error_message = error instanceof Error ? error.message : 'Unknown error';
    
    return fallbackResult;
  }
}

/**
 * Creates a mock weather response when API is not available
 */
function createMockWeatherResponse(args: WeatherArgs): object {
  return {
    status: 'success',
    location: args.location || 'Current Location',
    temperature: '18°C',
    condition: 'Partly Cloudy',
    light_level: 'Bright daylight, good visibility.',
    navigation_safety: {
      level: 'safe',
      recommendations: ['Good conditions for navigation']
    },
    mock_response: true
  };
}
