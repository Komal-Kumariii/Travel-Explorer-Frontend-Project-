const UNSPLASH_KEY = "9E0vTEsVt4KYYXkHFQSUi2Un09q0qB9B6CooshuFDbc";
const WEATHER_KEY = "294c2bf4adcdf4899b376cdb7fda8bf1";

const searchBtn = document.getElementById("search-btn");
const randomBtn = document.getElementById("random-btn");
const searchInput = document.getElementById("search-input");
const destinationInfo = document.getElementById("destination-info");
const historyList = document.getElementById("search-history");
const favoritesList = document.getElementById("favorites-list");
const tripListEl = document.getElementById("trip-list");
const totalCostEl = document.getElementById("total-cost");

const popularDestinations = ["Paris","Tokyo","New York","Sydney","Dubai","London","Rome",
  "India","Bangkok","Barcelona","Singapore","Los Angeles","Istanbul",
  "Cairo","Rio de Janeiro","Moscow","Beijing","Seoul","Cape Town", ];
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let tripList = JSON.parse(localStorage.getItem("tripList")) || [];

// Fetch images from Unsplash
async function fetchImages(destination){
  const res = await fetch(`https://api.unsplash.com/search/photos?query=${destination}&client_id=${UNSPLASH_KEY}&per_page=5`);
  const data = await res.json();
  return data.results.map(img => img.urls.small);
}

// Fetch current weather
async function fetchWeather(destination){
  const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${destination}&units=metric&appid=${WEATHER_KEY}`);
  const data = await res.json();
  if(data.cod !== 200) return null;
  return { temp: data.main.temp, description: data.weather[0].description, humidity: data.main.humidity };
}

// Fetch 5-day forecast
async function fetchForecast(destination){
  const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${destination}&units=metric&appid=${WEATHER_KEY}`);
  const data = await res.json();
  if(data.cod!=="200") return null;
  const list = data.list.filter(i => i.dt_txt.includes("12:00:00")).slice(0,5);
  return list.map(day => ({
    date: day.dt_txt.split(" ")[0],
    temp: day.main.temp,
    desc: day.weather[0].description,
    icon: `http://openweathermap.org/img/wn/${day.weather[0].icon}.png`
  }));
}

// Render Forecast
function renderForecast(forecast, container){
  if(!forecast) return;
  const slider = document.createElement("div");
  slider.className="forecast-slider";
  slider.innerHTML = forecast.map(f => `
    <div class="forecast-card">
      <p>${f.date}</p>
      <img src="${f.icon}" alt="${f.desc}">
      <p>${f.temp}°C</p>
      <p>${f.desc}</p>
    </div>
  `).join("");
  container.appendChild(slider);
}

// Render favorites
function renderFavorites(){
  favoritesList.innerHTML="";
  favorites.slice().reverse().forEach(dest=>{
    const li=document.createElement("li");
    li.dataset.destination = dest;
    li.innerHTML=`${dest} <button class="remove-fav"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm2 3h14v13H5V9zm5 2v9h2v-9h-2zm4 0v9h2v-9h-2z"/></svg></button>`;
    favoritesList.appendChild(li);
  });
}

// Add to favorites
function addToFavorites(destination){
  if(!favorites.includes(destination)){
    favorites.push(destination);
    localStorage.setItem("favorites",JSON.stringify(favorites));
    renderFavorites();
  }
}

// Remove from favorites
favoritesList.addEventListener("click", e=>{
  if(e.target.closest(".remove-fav")){
    const li=e.target.closest("li");
    const dest=li.dataset.destination;
    favorites=favorites.filter(f=>f!==dest);
    localStorage.setItem("favorites",JSON.stringify(favorites));
    renderFavorites();
  }
});

// Render Trip
function renderTrip(){
  tripListEl.innerHTML="";
  let total=0;
  tripList.forEach(item=>{
    const li=document.createElement("li");
    li.dataset.destination=item.name;
    total+=item.cost;
    li.innerHTML=`${item.name} - $${item.cost} <button class="remove-trip"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm2 3h14v13H5V9zm5 2v9h2v-9h-2zm4 0v9h2v-9h-2z"/></svg></button>`;
    tripListEl.appendChild(li);
  });
  totalCostEl.textContent=total;
}

// Add to Trip
function addToTrip(destination){
  if(!tripList.find(d=>d.name===destination)){
    const cost=Math.floor(Math.random()*200)+50;
    tripList.push({name:destination,cost:cost});
    localStorage.setItem("tripList",JSON.stringify(tripList));
    renderTrip();
  }
}

// Remove from Trip
tripListEl.addEventListener("click", e=>{
  if(e.target.closest(".remove-trip")){
    const li=e.target.closest("li");
    const name=li.dataset.destination;
    tripList=tripList.filter(d=>d.name!==name);
    localStorage.setItem("tripList",JSON.stringify(tripList));
    renderTrip();
  }
});

// Display destination card
async function displayDestination(destination){
  destinationInfo.innerHTML="";
  const images=await fetchImages(destination);
  const weather=await fetchWeather(destination);
  const forecast=await fetchForecast(destination);

  const card=document.createElement("div");
  card.className="destination-card";
  card.innerHTML=`
    <div class="carousel">${images.map(url=>`<img src="${url}" alt="${destination}">`).join("")}</div>
    <div class="info">
      <h2>${destination}</h2>
      ${weather?`<p>Temp: ${weather.temp}°C</p><p>${weather.description}</p>`:"<p>Weather info unavailable</p>"}
      <button id="fav-btn">❤️ Add to Favorites</button>
      <button id="trip-btn">🧳 Add to Trip </button>
      <div id="forecast-container"></div>
      <div id="map"></div>
    </div>
  `;
  destinationInfo.appendChild(card);

  document.getElementById("fav-btn").addEventListener("click",()=>addToFavorites(destination));
  document.getElementById("trip-btn").addEventListener("click",()=>addToTrip(destination));

  // Render forecast
  renderForecast(forecast, document.getElementById("forecast-container"));

  // Initialize map with Leaflet
  const map = L.map('map').setView([48.8566,2.3522],10); // default coords Paris
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
   // Try to fetch coordinates
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${destination}`);
    const geoData = await geoRes.json();
    if(geoData.length > 0) {
      const lat = geoData[0].lat;
      const lon = geoData[0].lon;
      map.setView([lat, lon], 10);
      L.marker([lat, lon]).addTo(map).bindPopup(destination).openPopup();
    }
}

// Event listeners
searchBtn.addEventListener("click",()=>{
  const destination=searchInput.value.trim();
  if(destination) displayDestination(destination);
});
randomBtn.addEventListener("click",()=>{
  const random=popularDestinations[Math.floor(Math.random()*popularDestinations.length)];
  displayDestination(random);
});

// Trigger search function
function performSearch() {
  const destination = searchInput.value.trim();
  if(destination) displayDestination(destination); // your existing function
}

// Button click
searchBtn.addEventListener("click", performSearch);

// Enter key press
searchInput.addEventListener("keyup", (event) => {
  if(event.key === "Enter") {
    performSearch();
  }
});


// Initialize
renderFavorites();
renderTrip();