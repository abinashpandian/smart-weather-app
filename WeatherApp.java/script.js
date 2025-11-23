const apiKey = "b39c2af85f709e22746a5355d4b85660"; // Your API key
const currentWeatherUrl = "https://api.openweathermap.org/data/2.5/weather?";
const forecastUrl = "https://api.openweathermap.org/data/2.5/forecast?";

const getWeatherBtn = document.getElementById("getWeatherBtn");
const locationBtn = document.getElementById("locationBtn");
const cityInput = document.getElementById("cityInput");
const weatherInfo = document.getElementById("weatherInfo");
const errorMessage = document.getElementById("errorMessage");

// Set default theme
document.body.className = 'default';

// Theme Switcher
function changeTheme(theme) {
    document.body.className = theme;
    localStorage.setItem('weatherTheme', theme);
}

// Load saved theme
window.addEventListener('load', () => {
    const savedTheme = localStorage.getItem('weatherTheme');
    if (savedTheme) {
        document.body.className = savedTheme;
    }
});

// Get Weather by City Name
getWeatherBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if (city === "") {
        showError("Please enter a city name!");
        return;
    }
    fetchWeather(`${currentWeatherUrl}q=${city}&appid=${apiKey}&units=metric`, city);
});

// Get Weather by Geolocation
locationBtn.addEventListener("click", () => {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                fetchWeather(`${currentWeatherUrl}lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`, null, lat, lon);
            },
            (error) => {
                hideLoading();
                showError("Unable to retrieve your location!");
            }
        );
    } else {
        showError("Geolocation is not supported by your browser!");
    }
});

// Fetch Current Weather Data
async function fetchWeather(url, city, lat, lon) {
    try {
        showLoading();
        const response = await fetch(url);
        const data = await response.json();

        hideLoading();

        if (response.ok) {
            displayWeather(data);
            // Fetch 7-day forecast
            if (city) {
                fetchForecast(`${forecastUrl}q=${city}&appid=${apiKey}&units=metric`);
            } else if (lat && lon) {
                fetchForecast(`${forecastUrl}lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
            }
            hideError();
        } else {
            showError("City not found! Please try another city.");
        }
    } catch (error) {
        hideLoading();
        showError("Network error. Please check your connection.");
        console.error("Error:", error);
    }
}

// Fetch 7-Day Forecast
async function fetchForecast(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            displayForecast(data);
        }
    } catch (error) {
        console.error("Error fetching forecast:", error);
    }
}

// Display Current Weather
function displayWeather(data) {
    try {
        document.getElementById("cityName").textContent = `${data.name}, ${data.sys.country}`;
        
        // Calculate and display local date/time
        const timezone = data.timezone;
        const localTime = new Date((Date.now() + timezone * 1000));
        
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
        };
        
        const formattedDateTime = localTime.toLocaleString('en-US', options);
        document.getElementById("dateTime").textContent = formattedDateTime;
        
        document.getElementById("temperature").textContent = `${Math.round(data.main.temp)}°C`;
        document.getElementById("description").textContent = data.weather[0].description;
        document.getElementById("humidity").textContent = `${data.main.humidity}%`;
        document.getElementById("windSpeed").textContent = `${data.wind.speed} m/s`;
        document.getElementById("feelsLike").textContent = `${Math.round(data.main.feels_like)}°C`;
        document.getElementById("visibility").textContent = `${(data.visibility / 1000).toFixed(1)} km`;
        document.getElementById("icon").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;

        displayOutfitAdvice(data.main.temp, data.weather[0].main, data.wind.speed);
        displayActivitySuggestions(data.weather[0].main, data.main.temp);

        weatherInfo.style.display = "block";
        console.log("✅ Weather displayed successfully!");
    } catch (error) {
        console.error("❌ Error displaying weather:", error);
        showError("Error displaying weather data.");
    }
}

// Display 7-Day Forecast
function displayForecast(data) {
    const forecastContainer = document.getElementById("weeklyForecast");
    forecastContainer.innerHTML = "";
    
    // Group forecasts by day (API gives 3-hour intervals)
    const dailyForecasts = {};
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toLocaleDateString('en-US');
        
        // Take the midday forecast (12:00 PM) as representative
        if (item.dt_txt.includes('12:00:00')) {
            dailyForecasts[dateKey] = item;
        } else if (!dailyForecasts[dateKey]) {
            // If no 12:00 PM data, use first available
            dailyForecasts[dateKey] = item;
        }
    });
    
    // Display up to 7 days
    const days = Object.values(dailyForecasts).slice(0, 7);
    
    days.forEach(day => {
        const date = new Date(day.dt * 1000);
        
        const dayCard = document.createElement('div');
        dayCard.className = 'forecast-day';
        
        dayCard.innerHTML = `
            <div class="forecast-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            <div class="forecast-day-name">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <img class="forecast-icon" src="<https://openweathermap.org/img/wn/${day.weather>[0].icon}@2x.png" alt="${day.weather[0].description}">
            <div class="forecast-temp">${Math.round(day.main.temp)}°C</div>
            <div class="forecast-desc">${day.weather[0].description}</div>
        `;
        
        forecastContainer.appendChild(dayCard);
    });
}

// Fetch and Display Tourist Spots (Real-time from API)
async function displayTouristSpots(cityName, lat, lon) {
    const touristSpotsContainer = document.getElementById("touristSpots");
    touristSpotsContainer.innerHTML = '<div class="loading">🗺️ Loading tourist spots...</div>';
    
    // Foursquare API credentials
    const foursquareApiKey = "YOUR_FOURSQUARE_API_KEY_HERE"; // Replace with your API key
    
    try {
        // If we have coordinates, use them; otherwise geocode the city name
        let searchLat = lat;
        let searchLon = lon;
        
        if (!searchLat || !searchLon) {
            // Use OpenWeatherMap's geocoding to get coordinates
            const geoResponse = await fetch(
                `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${apiKey}`
            );
            const geoData = await geoResponse.json();
            if (geoData.length > 0) {
                searchLat = geoData[0].lat;
                searchLon = geoData[0].lon;
            }
        }
        
        if (!searchLat || !searchLon) {
            throw new Error("Coordinates not found");
        }
        
        // Fetch tourist attractions from Foursquare
        const response = await fetch(
            `https://api.foursquare.com/v3/places/search?ll=${searchLat},${searchLon}&categories=16000&limit=10`,
            {
                headers: {
                    'Authorization': foursquareApiKey,
                    'Accept': 'application/json'
                }
            }
        );
        
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            touristSpotsContainer.innerHTML = `
                <div class="no-spots">
                    <p>🗺️ No tourist information found for ${cityName}</p>
                    <p style="margin-top: 10px;">
                        <a href="https://www.google.com/search?q=tourist+places+in+${encodeURIComponent(cityName)}" 
                           target="_blank" 
                           style="color: #667eea; text-decoration: none;">
                           Search tourist spots on Google →
                        </a>
                    </p>
                </div>
            `;
            return;
        }
        
        // Clear loading message
        touristSpotsContainer.innerHTML = '';
        
        // Display tourist spots
        data.results.slice(0, 6).forEach(place => {
            const spotCard = document.createElement('div');
            spotCard.className = 'spot-card';
            
            // Get category icon
            const icon = getCategoryIcon(place.categories);
            
            // Build Google Maps link
            const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)},${searchLat},${searchLon}`;
            
            spotCard.innerHTML = `
                <div class="spot-header">
                    <div class="spot-icon">${icon}</div>
                    <div class="spot-name">${place.name}</div>
                </div>
                <div class="spot-description">${place.location.formatted_address || place.location.address || 'Tourist attraction in ' + cityName}</div>
                <a href="${mapsLink}" target="_blank" class="spot-link">View on Map →</a>
            `;
            
            touristSpotsContainer.appendChild(spotCard);
        });
        
    } catch (error) {
        console.error("Error fetching tourist spots:", error);
        touristSpotsContainer.innerHTML = `
            <div class="no-spots">
                <p>🗺️ Unable to load tourist spots at the moment</p>
                <p style="margin-top: 10px;">
                    <a href="https://www.google.com/search?q=tourist+places+in+${encodeURIComponent(cityName)}" 
                       target="_blank" 
                       style="color: #667eea; text-decoration: none;">
                       Search tourist spots on Google →
                    </a>
                </p>
            </div>
        `;
    }
}

// Get appropriate icon based on place category
function getCategoryIcon(categories) {
    if (!categories || categories.length === 0) return "🏛️";
    
    const categoryName = categories[0].name.toLowerCase();
    
    if (categoryName.includes('museum') || categoryName.includes('art')) return "🎨";
    if (categoryName.includes('temple') || categoryName.includes('church') || categoryName.includes('mosque')) return "🕌";
    if (categoryName.includes('park') || categoryName.includes('garden')) return "🌳";
    if (categoryName.includes('beach')) return "🏖️";
    if (categoryName.includes('monument') || categoryName.includes('memorial')) return "🗿";
    if (categoryName.includes('tower') || categoryName.includes('building')) return "🏢";
    if (categoryName.includes('castle') || categoryName.includes('palace')) return "🏰";
    if (categoryName.includes('zoo') || categoryName.includes('aquarium')) return "🦁";
    if (categoryName.includes('market') || categoryName.includes('shopping')) return "🛍️";
    if (categoryName.includes('restaurant') || categoryName.includes('food')) return "🍴";
    
    return "🏛️"; // Default icon
}



// Outfit Advisor
function displayOutfitAdvice(temp, condition, windSpeed) {
    let advice = "";
    
    if (temp < 10) {
        advice = "🧥 It's cold! Wear a heavy jacket, scarf, and gloves. Layer up with warm clothes.";
    } else if (temp >= 10 && temp < 18) {
        advice = "🧥 Cool weather. A light jacket or sweater would be perfect. Jeans and closed shoes recommended.";
    } else if (temp >= 18 && temp < 25) {
        advice = "👕 Pleasant temperature! T-shirt with light pants or jeans. Comfortable casual wear.";
    } else if (temp >= 25 && temp < 32) {
        advice = "👕 Warm day! Light, breathable clothing. Shorts and t-shirt are ideal. Don't forget sunglasses!";
    } else {
        advice = "🩳 Very hot! Wear minimal, light-colored clothing. Stay hydrated and use sunscreen.";
    }

    if (condition === "Rain" || condition === "Drizzle") {
        advice += " ☔ Don't forget your umbrella or raincoat!";
    }

    if (windSpeed > 8) {
        advice += " 💨 It's windy - secure loose clothing!";
    }

    document.getElementById("outfitSuggestion").textContent = advice;
}

// Activity Suggestions
function displayActivitySuggestions(condition, temp) {
    const activitiesDiv = document.getElementById("activities");
    activitiesDiv.innerHTML = "";
    
    let activities = [];

    if (condition === "Clear" && temp >= 18 && temp <= 28) {
        activities = ["🚴 Cycling", "🏃 Jogging", "🏞️ Hiking", "📸 Photography", "🧺 Picnic"];
    } else if (condition === "Clear" && temp > 28) {
        activities = ["🏊 Swimming", "🍦 Get Ice Cream", "🌴 Beach Visit", "💧 Water Sports"];
    } else if (condition === "Rain" || condition === "Drizzle") {
        activities = ["📚 Read a Book", "🎬 Watch Movies", "☕ Cafe Time", "🎨 Indoor Hobbies", "🎮 Gaming"];
    } else if (condition === "Clouds") {
        activities = ["🚶 Walking", "🛍️ Shopping", "📷 Street Photography", "☕ Coffee Shop"];
    } else if (condition === "Snow") {
        activities = ["⛷️ Skiing", "⛸️ Ice Skating", "☃️ Build Snowman", "🔥 Stay Cozy Inside"];
    } else {
        activities = ["🏠 Indoor Activities", "🎵 Listen to Music", "🍳 Cook Something", "📖 Learn New Skill"];
    }

    activities.forEach(activity => {
        const tag = document.createElement("span");
        tag.className = "activity-tag";
        tag.textContent = activity;
        activitiesDiv.appendChild(tag);
    });
}

function showLoading() {
    hideError();
    weatherInfo.style.display = "block";
}

function hideLoading() {
    // Keep weatherInfo visible
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    weatherInfo.style.display = "none";
}

function hideError() {
    errorMessage.style.display = "none";
}

cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        getWeatherBtn.click();
    }
});

cityInput.addEventListener("focus", () => {
    cityInput.select();
});

console.log("✅ Script loaded successfully!");
