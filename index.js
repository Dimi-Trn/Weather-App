import dotenv from "dotenv";
dotenv.config();

import express from "express";
import axios from "axios";
import session from "express-session";
import pg from "pg";

const app = express();
const port = 3000;

const API_KEY = process.env.WEATHER_API_KEY;


const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});


let citiesConfig = [];


async function loadCities() {
  try {
    const result = await db.query("SELECT * FROM cities");

    citiesConfig = result.rows;
    

    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });

  } catch (err) {
    console.error("Error executing query", err.stack);
  }
}


const countryCodeToName = {
  "GB": "United Kingdom",
  "GR": "Greece",
  "US": "United States",
  "FR": "France",
  "JP": "Japan",
  "DE": "Germany",
  "IT": "Italy",
  "ES": "Spain",
  "NL": "Netherlands",
  "PT": "Portugal",
  "AT": "Austria",
  "CZ": "Czech Republic",
  "PL": "Poland",
  "HU": "Hungary",
  "AE": "United Arab Emirates",
  "AU": "Australia",
  "CA": "Canada",
  "KR": "South Korea",
  "TH": "Thailand",
  "EG": "Egypt",
  "TR": "Turkey"
};

function getCountryName(code) {
  return countryCodeToName[code.toUpperCase()] || code;
}


app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.set("view engine", "ejs");

// Login page
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.LOGIN_USER && password === process.env.LOGIN_PASSWORD) {
    req.session.loggedIn = true;
    res.redirect("/");
  } else {
    res.render("login", { error: "Wrong username or password" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// Weather page
app.get("/", async (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/login");

  try {
    const responses = await Promise.all(
      citiesConfig.map(city =>
        axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city.query}&units=metric&appid=${API_KEY}`)
      )
    );

    const citiesData = responses.map((resp, i) => {
      const d = resp.data;
      const cfg = citiesConfig[i];
      return {
        cityName: d.name,
        countryName: getCountryName(d.sys.country),
        sky_condition: d.weather[0].description,
        temperature: Math.round(d.main.temp),
        humidity: d.main.humidity,
        visibility: Math.round(d.visibility / 1000),
        windspeed: d.wind.speed.toFixed(1),
        image: cfg.image
      };
    });

    res.render("index", { citiesData });
  } catch (err) {
    console.error("Weather API error:", err.message);
    res.status(500).send("Weather API error – check console");
  }
});

loadCities();
