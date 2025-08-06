const axios = require("axios");
const dayjs = require("dayjs");
const stravaV3 = require("strava-v3");
require("dotenv").config();

// 🔐 Remplace avec tes infos Strava API
const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const ACCESS_TOKEN = process.env.STRAVA_ACCESS_TOKEN;
const REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;
const PERSONAL_ID = process.env.STRAVA_RP_ID;
const AUTH_CODE = process.env.STRAVA_AUTH_CODE;

async function getAccessToken() {
  const response = await axios.post(
    "https://www.strava.com/api/v3/oauth/token",
    null,
    {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: REFRESH_TOKEN,
      },
    }
  );
  return response.data.access_token;
}

async function getActivities(token, beforeDate) {
  const perPage = 200;
  const allActivities = [];

  let page = 1;
  let fetchMore = true;

  while (fetchMore) {
    const res = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          per_page: perPage,
          page,
          before: beforeDate,
        },
      }
    );

    const activities = res.data;
    allActivities.push(...activities);
    if (activities.length < perPage) fetchMore = false;
    else page++;
  }

  return allActivities;
}

// TSS estimation (approximative)
function estimateTSS(durationMin, hrAvg, sportType) {
  if (!hrAvg || !durationMin) return 0;
  const intensityFactor = hrAvg / 190; // 190 comme HRmax approximative
  const tss = durationMin * intensityFactor * intensityFactor;
  return sportType === "Run" ? tss * 1.1 : tss; // un peu plus haut pour course
}

async function verification() {
  // const config = {
  //   access_token: ACCESS_TOKEN,
  //   client_id: CLIENT_ID,
  //   client_secret: CLIENT_SECRET,
  //   redirect_uri: "test",
  // };

  // stravaV3.athletes.get({ id: PERSONAL_ID }, (err, payload, limits) => {
  //   console.log("res", err, payload, limits);
  // });

  const config = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: AUTH_CODE,
    grant_type: "authorization_code",
  };

  console.log("config", config);

  // const result = await axios.post(
  //   "https://www.strava.com/oauth/token",
  //   null,
  //   config
  // );
  // console.log("res", result);
}

(async () => {
  const test = await verification();
  // const accessToken = await getAccessToken();

  // const beforeDate = Math.floor(Date.now() / 1000); // now
  // const activities = await getActivities(accessToken, beforeDate);
  // console.log("env", activities);

  // const trainingData = activities
  //   .filter((a) => ["Ride", "Run", "Hike"].includes(a.type)) // Garde les activités utiles
  //   .map((a) => {
  //     const durationMin = a.elapsed_time / 60;
  //     const tss = estimateTSS(durationMin, a.average_heartrate, a.type);

  //     return {
  //       date: a.start_date_local.slice(0, 10),
  //       name: a.name,
  //       type: a.type,
  //       durationMin,
  //       distanceKm: a.distance / 1000,
  //       elevationGain: a.total_elevation_gain,
  //       avgHR: a.average_heartrate,
  //       tss: Math.round(tss),
  //     };
  //   });

  // console.table(trainingData);

  // ➕ Prochaine étape : calcul CTL/ATL/TSB à partir de ce tableau
})();
