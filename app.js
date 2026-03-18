/**
 * SkyCast - Weather Application
 * Logic for fetching data from Open-Meteo and OpenStreetMap
 */

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const weatherDisplay = document.getElementById('weatherDisplay');
const welcomeScreen = document.getElementById('welcomeScreen');
const errorState = document.getElementById('errorState');
const loadingState = document.getElementById('loadingState');
const errorMessage = document.getElementById('errorMessage');

// UI Elements
const cityNameEl = document.getElementById('cityName');
const countryNameEl = document.getElementById('countryName');
const dateTimeEl = document.getElementById('dateTime');
const temperatureEl = document.getElementById('temperature');
const weatherDescEl = document.getElementById('weatherDesc');
const weatherIconContainer = document.getElementById('weatherIconContainer');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('windSpeed');
const feelsLikeEl = document.getElementById('feelsLike');
const visibilityEl = document.getElementById('visibility');
const forecastGrid = document.getElementById('forecastGrid');

// Icon mapping based on WMO Weather interpretation codes
const weatherIcons = {
    0: 'sun', // Clear sky
    1: 'cloud-sun', // Mainly clear
    2: 'cloud-sun', // Partly cloudy
    3: 'cloud', // Overcast
    45: 'cloud-fog', // Fog
    48: 'cloud-fog', // Depositing rime fog
    51: 'cloud-drizzle', // Drizzle: Light
    53: 'cloud-drizzle', // Drizzle: Moderate
    55: 'cloud-drizzle', // Drizzle: Dense intensity
    61: 'cloud-rain', // Rain: Slight
    63: 'cloud-rain', // Rain: Moderate
    65: 'cloud-rain', // Rain: Heavy intensity
    71: 'cloud-snow', // Snow fall: Slight
    73: 'cloud-snow', // Snow fall: Moderate
    75: 'cloud-snow', // Snow fall: Heavy intensity
    80: 'cloud-rain-wind', // Rain showers: Slight
    81: 'cloud-rain-wind', // Rain showers: Moderate
    82: 'cloud-rain-wind', // Rain showers: Violent
    95: 'cloud-lightning', // Thunderstorm: Slight or moderate
};

const weatherDescriptions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
};

// Event Listeners
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherData(city);
        }
    }
});

async function getWeatherData(city) {
    showState('loading');
    
    try {
        // 1. Geocoding: Get coordinates for the city
        const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`;
        const geoResponse = await fetch(geoUrl, {
            headers: {
                'Accept-Language': 'en'
            }
        });
        
        if (!geoResponse.ok) throw new Error('Location search failed');
        
        const geoData = await geoResponse.json();
        
        if (geoData.length === 0) {
            throw new Error(`Couldn't find "${city}". Check the spelling.`);
        }
        
        const { lat, lon, display_name } = geoData[0];
        const locationParts = display_name.split(', ');
        const cityName = locationParts[0];
        const countryName = locationParts[locationParts.length - 1];
        
        // 2. Weather: Get weather data using coordinates (request 8 days to show 7 future days)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=8`;
        
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) throw new Error('Weather data fetch failed');
        
        const weatherData = await weatherResponse.json();
        
        updateUI(cityName, countryName, weatherData);
        showState('display');
        
    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = error.message;
        showState('error');
    }
}

function updateUI(city, country, data) {
    const current = data.current;
    const daily = data.daily;
    
    // Set Current Weather
    cityNameEl.textContent = city;
    countryNameEl.textContent = country;
    
    const now = new Date();
    dateTimeEl.textContent = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    });
    
    temperatureEl.textContent = Math.round(current.temperature_2m);
    humidityEl.textContent = `${current.relative_humidity_2m}%`;
    windSpeedEl.textContent = `${current.wind_speed_10m} km/h`;
    feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)}°C`;
    visibilityEl.textContent = `${(current.visibility / 1000).toFixed(1)} km`;
    
    const code = current.weather_code;
    const description = weatherDescriptions[code] || 'Unknown';
    const iconName = weatherIcons[code] || 'cloud';
    
    weatherDescEl.textContent = description;
    
    // Update main icon by replacing innerHTML for clean refresh
    weatherIconContainer.innerHTML = `<i data-lucide="${iconName}" class="large-icon"></i>`;
    
    // Forecast: show next 7 days (including extra for grid stability)
    forecastGrid.innerHTML = '';
    for (let i = 1; i <= 7; i++) {
        const date = new Date(daily.time[i]);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const fCode = daily.weather_code[i];
        const fIcon = weatherIcons[fCode] || 'cloud';
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <p class="day">${dayName}</p>
            <i data-lucide="${fIcon}"></i>
            <p class="temp">${maxTemp}° / ${minTemp}°</p>
        `;
        forecastGrid.appendChild(forecastItem);
    }
    
    // Re-initialize icons
    lucide.createIcons();
    
    // Dynamic Theme adjustment (Optional: Change primary color based on temperature)
    if (current.temperature_2m > 25) {
        document.documentElement.style.setProperty('--primary', '#FF512F');
        document.documentElement.style.setProperty('--secondary', '#DD2476');
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #FF512F 0%, #DD2476 100%)');
    } else if (current.temperature_2m < 5) {
        document.documentElement.style.setProperty('--primary', '#2193b0');
        document.documentElement.style.setProperty('--secondary', '#6dd5ed');
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)');
    } else {
        document.documentElement.style.setProperty('--primary', '#4776E6');
        document.documentElement.style.setProperty('--secondary', '#8E54E9');
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)');
    }
}

function showState(state) {
    welcomeScreen.classList.add('hidden');
    weatherDisplay.classList.add('hidden');
    errorState.classList.add('hidden');
    loadingState.classList.add('hidden');
    
    if (state === 'loading') loadingState.classList.remove('hidden');
    else if (state === 'display') weatherDisplay.classList.remove('hidden');
    else if (state === 'error') errorState.classList.remove('hidden');
    else if (state === 'welcome') welcomeScreen.classList.remove('hidden');
}
