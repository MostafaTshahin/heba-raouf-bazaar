// Weather Dashboard API Configuration
const API_KEY = 'YOUR_API_KEY'; // Get free key from: https://openweathermap.org/api
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const UV_API_URL = 'https://api.openweathermap.org/data/2.5/uvi';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const weatherContent = document.getElementById('weatherContent');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error');
const recentSearchesDiv = document.getElementById('recentSearches');

// Recent searches from localStorage
let recentSearches = JSON.parse(localStorage.getItem('weatherSearches')) || [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    searchBtn.addEventListener('click', searchWeather);
    locationBtn.addEventListener('click', getLocationWeather);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchWeather();
    });
    displayRecentSearches();
    // Load default city on startup
    searchWeatherByCity('Cairo');
});

// Search weather by city name
async function searchWeather() {
    const city = cityInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }
    searchWeatherByCity(city);
}

// Main weather fetch function
async function searchWeatherByCity(city) {
    if (!city) return;

    showLoading(true);
    hideError();
    hideWeatherContent();

    try {
        // Check if API key is configured
        if (API_KEY === 'YOUR_API_KEY') {
            throw new Error('Weather API key not configured. Please follow the setup instructions.');
        }

        // Fetch current weather
        const weatherResponse = await fetch(
            `${WEATHER_API_URL}?q=${city}&appid=${API_KEY}&units=metric`
        );

        if (!weatherResponse.ok) {
            if (weatherResponse.status === 404) {
                throw new Error('City not found. Please check the spelling.');
            }
            throw new Error('Failed to fetch weather data');
        }

        const weatherData = await weatherResponse.json();

        // Fetch forecast data
        const forecastResponse = await fetch(
            `${FORECAST_API_URL}?q=${city}&appid=${API_KEY}&units=metric`
        );

        const forecastData = await forecastResponse.json();

        // Fetch UV Index
        const uvResponse = await fetch(
            `${UV_API_URL}?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&appid=${API_KEY}`
        );

        const uvData = uvResponse.ok ? await uvResponse.json() : null;

        // Display data
        displayCurrentWeather(weatherData);
        displayForecast(forecastData);
        displayUVIndex(uvData);

        // Add to recent searches
        addToRecentSearches(weatherData.name);

        showLoading(false);
        showWeatherContent(true);

        // Clear input
        cityInput.value = '';

    } catch (error) {
        showLoading(false);
        showError(error.message);
        console.error('Error fetching weather:', error);
    }
}

// Get weather by geolocation
function getLocationWeather() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    showLoading(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoords(latitude, longitude);
        },
        (error) => {
            showLoading(false);
            showError('Unable to get your location. Please enable location access.');
            console.error('Geolocation error:', error);
        }
    );
}

// Fetch weather by coordinates
async function fetchWeatherByCoords(lat, lon) {
    if (API_KEY === 'YOUR_API_KEY') {
        showLoading(false);
        showError('Weather API key not configured');
        return;
    }

    try {
        const weatherResponse = await fetch(
            `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );

        const forecastResponse = await fetch(
            `${FORECAST_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );

        const uvResponse = await fetch(
            `${UV_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();
        const uvData = uvResponse.ok ? await uvResponse.json() : null;

        displayCurrentWeather(weatherData);
        displayForecast(forecastData);
        displayUVIndex(uvData);

        addToRecentSearches(weatherData.name);

        showLoading(false);
        showWeatherContent(true);

    } catch (error) {
        showLoading(false);
        showError('Error fetching location weather: ' + error.message);
    }
}

// Display current weather
function displayCurrentWeather(data) {
    const weather = data.weather[0];
    const main = data.main;
    const wind = data.wind;
    const sys = data.sys;
    const clouds = data.clouds;

    // Update weather info
    document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('weatherDescription').textContent = weather.description;
    document.getElementById('temperature').textContent = Math.round(main.temp);
    document.getElementById('feelsLike').textContent = Math.round(main.feels_like);
    document.getElementById('humidity').textContent = main.humidity;
    document.getElementById('windSpeed').textContent = wind.speed.toFixed(1);
    document.getElementById('windDegree').textContent = wind.deg || 0;
    document.getElementById('pressure').textContent = main.pressure;
    document.getElementById('visibility').textContent = (data.visibility / 1000).toFixed(1);
    document.getElementById('cloudiness').textContent = clouds.all;
    document.getElementById('tempMax').textContent = Math.round(main.temp_max);
    document.getElementById('tempMin').textContent = Math.round(main.temp_min);

    // Sunrise and sunset
    document.getElementById('sunrise').textContent = formatTime(sys.sunrise);
    document.getElementById('sunset').textContent = formatTime(sys.sunset);

    // Weather icon
    const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}@4x.png`;
    document.getElementById('weatherIcon').src = iconUrl;

    // Last update
    const now = new Date();
    document.getElementById('lastUpdate').textContent = `Last updated: ${now.toLocaleString()}`;
}

// Display 5-day forecast
function displayForecast(data) {
    const forecastContainer = document.getElementById('forecastContainer');
    forecastContainer.innerHTML = '';

    // Get one forecast per day (every 8 intervals since forecast is every 3 hours)
    const dailyForecasts = [];
    let lastDate = null;

    data.list.forEach(forecast => {
        const forecastDate = new Date(forecast.dt * 1000).toLocaleDateString();
        if (forecastDate !== lastDate) {
            dailyForecasts.push(forecast);
            lastDate = forecastDate;
        }
    });

    dailyForecasts.slice(0, 5).forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const weather = forecast.weather[0];

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-date">${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <img src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" alt="${weather.description}" class="forecast-icon">
            <div class="forecast-temp">${Math.round(forecast.main.temp)}°C</div>
            <div class="forecast-desc">${weather.description}</div>
        `;
        forecastContainer.appendChild(card);
    });
}

// Display UV Index
function displayUVIndex(uvData) {
    const uvIndexEl = document.getElementById('uvIndex');
    if (!uvData) {
        uvIndexEl.textContent = 'Not available';
        return;
    }

    const uvIndex = uvData.value.toFixed(1);
    let uvLevel = 'Low';
    if (uvIndex > 2) uvLevel = 'Moderate';
    if (uvIndex > 5) uvLevel = 'High';
    if (uvIndex > 7) uvLevel = 'Very High';
    if (uvIndex > 10) uvLevel = 'Extreme';

    uvIndexEl.textContent = `${uvIndex} (${uvLevel})`;
}

// Add to recent searches
function addToRecentSearches(city) {
    if (!recentSearches.includes(city)) {
        recentSearches.unshift(city);
        if (recentSearches.length > 10) {
            recentSearches.pop();
        }
        localStorage.setItem('weatherSearches', JSON.stringify(recentSearches));
        displayRecentSearches();
    }
}

// Display recent searches
function displayRecentSearches() {
    if (recentSearches.length === 0) {
        recentSearchesDiv.innerHTML = '';
        return;
    }

    let html = '<h3>Recent Searches</h3><div class="recent-searches-list">';
    recentSearches.forEach(city => {
        html += `<button class="search-tag" onclick="searchWeatherByCity('${city}')">${city}</button>`;
    });
    html += '</div>';
    recentSearchesDiv.innerHTML = html;
}

// Utility functions
function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function showLoading(show) {
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function showWeatherContent(show) {
    if (show) {
        weatherContent.classList.remove('hidden');
    } else {
        weatherContent.classList.add('hidden');
    }
}

function hideWeatherContent() {
    weatherContent.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

// Display demo data when API key is not configured
window.addEventListener('DOMContentLoaded', () => {
    if (API_KEY === 'YOUR_API_KEY') {
        showError('⚠️ Setup Required: Weather API key not configured. Please follow the instructions in weather-script.js line 6-7 to get a free API key from https://openweathermap.org/api');
    }
});
