import express from "express";
import axios from "axios";
import session from "express-session";

const app = express();
const port = 3000;

const API_KEY = "3bf02a5c9ac6bfa82c02d4fef7806da9";

const citiesConfig = [
  { name: "London",   query: "London,GB",   image: "/images/London.jpg" },
  { name: "Athens",   query: "Athens,GR",   image: "/images/Athens.jpg" },
  { name: "New York", query: "New York,US", image: "/images/New York.jpg" },
  { name: "Paris",    query: "Paris,FR",    image: "/images/Paris.jpg" }
];


const countryCodeToName = {
  "GB": "United Kingdom",
  "GR": "Greece",
  "US": "United States",
  "FR": "France"
};

function getCountryName(code) {
  return countryCodeToName[code.toUpperCase()] || code;
}


app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "PaPaR@meriC@noo",
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
  if (username === "DimiTrn" && password === "1234") {
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

app.listen(port, () => {
  console.log(`Server running → http://localhost:${port}`);
});