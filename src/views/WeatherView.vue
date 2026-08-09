<template>
  <div class="container">
    <div class="header">
      <h1>WEATHER APP</h1>
      <div class="search-bar">
        <input
          type="text"
          v-model="city"
          placeholder="Enter city name"
          class="search-input"
        />
        <button @click="searchByCity" class="search-button">Search</button>
        <br />
        <br />
        Please implement "Search Weather by City".
      </div>
    </div>

    <!--The <main> tag in HTML is used to specify the main content of a document
    More info about main, check https://www.w3schools.com/tags/tag_main.asp-->
    <main>
      <!--If there are no data returned, then skip rendering the information-->
      <div v-if="weatherData">
        <!--Display the weather data attribute returned from API
        Example of API data: https://openweathermap.org/current-->
        <h2>
          {{ weatherData.name }}, {{ weatherData.sys.country }}
        </h2>
        <div>
          <!--The image source of of the weather icon will be coming from a function called iconUrl
          which will be shared in script later-->
          <img :src="iconUrl" alt="Weather Icon" />
          <p>{{ temperature }} °C</p>
        </div>
        <!-- weather[0] means the current weather, the way we need to obtain data depends on how
        the API JSON data looks-->
        <span>{{ weatherData.weather[0].description }}</span>
      </div>
    </main>
  </div>
</template>

<script>
// The info section in 10.1.1 provided detailed information about this package
import axios from "axios";

const Default = "14f0d3eb219e9d0c432192b7606bec01";

export default {
  name: "App",
  data() {
    return {
      city: "",
      weatherData: null,
      hourlyForecast: [],
      dailyForecast: [],
    };
  },
  //computed is a property that is used to define a property that
  //is dependent on other data properties.
  //If we using a more easy to understand words to understand the concept:
  //the derived value such as temperature automatically update when the relevant value change.
  computed: {
    //There are multiple way to obtain the data in Celsius format.
    //Calculation by yourself like below after data is retireved or via API parameters

    //Example of adding additional units requirement, if you choose this, remember to change section 3.1
    //https://api.openweathermap.org/data/2.5/weather?lat=XXX&lon=-XXX.15&appid={API key}&units=metric
    temperature() {
      return this.weatherData
        ? Math.floor(this.weatherData.main.temp - 273)
        : null;
    },
    //Get the current weather icon using the API link
    iconUrl() {
      return this.weatherData
        ? `http://api.openweathermap.org/img/w/${this.weatherData.weather[0].icon}.png`
        : null;
    },
  },
  methods: {
    //There are two steps involved in this,
    //step 1: identify current location
    //step 2: search weather by city name
    async searchByCity() {
      if (!this.city) {
        return;
      }
      try {
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${this.city}&appid=${Default}`
        );
        this.weatherData = response.data;
      } catch (error) {
        console.error("Error fetching weather data:", error);
        alert("Could not retrieve weather data. Please check the city name and your API key.");
      }
    },
  },
};
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header h1 {
  text-align: center;
  margin-bottom: 20px;
}

.search-bar {
  text-align: center;
  margin-bottom: 30px;
}

.search-input {
  padding: 10px 15px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 250px;
  margin-right: 10px;
}

.search-button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.search-button:hover {
  background-color: #0056b3;
}

main {
  text-align: center;
}

main h2 {
  font-size: 24px;
  margin-bottom: 15px;
}

main img {
  width: 80px;
  height: 80px;
}

main p {
  font-size: 36px;
  font-weight: bold;
  margin: 10px 0;
}

main span {
  font-size: 18px;
  text-transform: capitalize;
}
</style>
