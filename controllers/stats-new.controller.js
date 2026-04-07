const asyncHandler = require("#utils/async-handler");
const { google } = require("googleapis");

const Site = require("#models/site.model");
const User = require("#models/user.model");


// =========================
// OAUTH CONFIG
// =========================
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

// =========================
// SCOPES
// =========================
const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
];

// =========================
// CONNECT GOOGLE
// =========================

exports.connectGoogle = asyncHandler(async (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: req.user.id,
  });

  return res.json({ url });
});


// =========================
// CALLBACK
// =========================
exports.googleCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;

  console.log("➡️ Google callback triggered");

  const { tokens } = await oauth2Client.getToken(code);

  console.log("🔥 TOKENS RECEIVED:", tokens);

  if (!tokens.refresh_token) {
    console.warn("❌ No refresh_token — reconnect Google!");
  }

  await User.findByIdAndUpdate(state, {
    googleTokens: tokens,
  });

  console.log("✅ Tokens saved");

  return res.redirect(process.env.CLIENT_URL);
});

// =========================
// DATE HELPERS
// =========================
const getDateRange = () => {
  const today = new Date();
  const endDate = today.toISOString().split("T")[0];

  const past = new Date();
  past.setDate(today.getDate() - 7);
  const startDate = past.toISOString().split("T")[0];

  return { startDate, endDate };
};

// =========================
// GET REAL STATS
// =========================
exports.getAiStats = asyncHandler(async (req, res) => {
  const { siteId } = req.body;

  console.log("➡️ getAiStats:", siteId);

  if (!siteId) {
    return res.status(400).json({
      success: false,
      message: "siteId is required",
    });
  }

  // =========================
  // LOAD DATA
  // =========================
  const site = await Site.findById(siteId);
  const user = await User.findById(req.user.id);

  if (!site || !user?.googleTokens) {
    return res.status(400).json({
      success: false,
      message: "Google not connected or site missing",
    });
  }

  // =========================
  // AUTH
  // =========================
  oauth2Client.setCredentials(user.googleTokens);

  const analyticsData = google.analyticsdata("v1beta");
  const searchconsole = google.searchconsole({
    version: "v1",
    auth: oauth2Client,
  });

  if (!site.gaPropertyId) {
    return res.status(404).json({
      success: false,
      message: "GA property id is missing",
    });
  }

  // =========================
  // DATE HELPERS (GSC ONLY)
  // =========================
  const formatDate = (date) => date.toISOString().split("T")[0];

  const getDateRanges = () => {
    const today = new Date();

    const currentStart = new Date();
    currentStart.setDate(today.getDate() - 7);

    const prevStart = new Date();
    prevStart.setDate(today.getDate() - 14);

    const prevEnd = new Date();
    prevEnd.setDate(today.getDate() - 8);

    return {
      current: {
        startDate: formatDate(currentStart),
        endDate: formatDate(today),
      },
      previous: {
        startDate: formatDate(prevStart),
        endDate: formatDate(prevEnd),
      },
    };
  };

  const { current, previous } = getDateRanges();

  // =========================
  // HELPER: % CHANGE
  // =========================
  const calcChange = (current, previous) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";

    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? "+" : "";

    return `${sign}${change.toFixed(1)}%`;
  };

  // =========================
  // GA: CURRENT + PREVIOUS
  // =========================
  let currentUsers = 0;
  let prevUsers = 0;

  try {
    const gaRes = await analyticsData.properties.runReport({
      property: `properties/${site.gaPropertyId}`,
      requestBody: {
        dateRanges: [
          { startDate: "7daysAgo", endDate: "today" },
          { startDate: "14daysAgo", endDate: "7daysAgo" },
        ],
        metrics: [{ name: "activeUsers" }],
      },
      auth: oauth2Client,
    });

    currentUsers = Number(
      gaRes.data.rows?.[0]?.metricValues?.[0]?.value || 0
    );

    prevUsers = Number(
      gaRes.data.rows?.[0]?.metricValues?.[1]?.value || 0
    );
  } catch (err) {
    console.error("❌ GA ERROR:", err.response?.data || err);
    throw err;
  }

  // =========================
  // GA: CHART (current only)
  // =========================
  let chartData = [];

  try {
    const chartRes = await analyticsData.properties.runReport({
      property: `properties/${site.gaPropertyId}`,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      },
      auth: oauth2Client,
    });

    chartData =
      chartRes.data.rows?.map((row) => ({
        name: row.dimensionValues?.[0]?.value,
        searches: Number(row.metricValues?.[1]?.value || 0),
        clicks: Number(row.metricValues?.[0]?.value || 0),
      })) || [];
  } catch (err) {
    console.error("❌ GA CHART ERROR:", err.response?.data || err);
    throw err;
  }

  // =========================
  // GA: GEO (current only)
  // =========================
  let geoMarkers = [];

  try {
    const geoRes = await analyticsData.properties.runReport({
      property: `properties/${site.gaPropertyId}`,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "city" }],
        metrics: [{ name: "activeUsers" }],
      },
      auth: oauth2Client,
    });

    geoMarkers =
      geoRes.data.rows?.slice(0, 5).map((row, i) => ({
        name: row.dimensionValues?.[0]?.value,
        coordinates: [0, 0],
        clicks: Number(row.metricValues?.[0]?.value || 0),
        markerOffset: i % 2 === 0 ? -15 : 25,
      })) || [];
  } catch (err) {
    console.error("❌ GA GEO ERROR:", err.response?.data || err);
    throw err;
  }

  // =========================
  // GSC SETUP
  // =========================
  const normalizeDomainProperty = (url) => {
    return `sc-domain:${url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")}`;
  };

  const siteUrl = normalizeDomainProperty(site.url);

  // =========================
  // GSC: CURRENT
  // =========================
  let currentClicks = 0;
  let currentSearches = 0;

  try {
    const currentGSC = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: current,
    });

    (currentGSC.data.rows || []).forEach((r) => {
      currentClicks += r.clicks || 0;
      currentSearches += r.impressions || 0;
    });
  } catch (err) {
    console.error("❌ GSC CURRENT ERROR:", err.response?.data || err);
    throw err;
  }

  // =========================
  // GSC: PREVIOUS
  // =========================
  let prevClicks = 0;
  let prevSearches = 0;

  try {
    const prevGSC = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: previous,
    });

    (prevGSC.data.rows || []).forEach((r) => {
      prevClicks += r.clicks || 0;
      prevSearches += r.impressions || 0;
    });
  } catch (err) {
    console.error("❌ GSC PREVIOUS ERROR:", err.response?.data || err);
    throw err;
  }

  // =========================
  // CALCULATE CHANGES
  // =========================
  const searchChange = calcChange(currentSearches, prevSearches);
  const clickChange = calcChange(currentClicks, prevClicks);
  const visitorChange = calcChange(currentUsers, prevUsers);

  // =========================
  // RESPONSE
  // =========================
  return res.status(200).json({
    success: true,
    data: {
      totalSearches: currentSearches,
      totalClicks: currentClicks,
      uniqueVisitors: currentUsers,

      searchChange,
      clickChange,
      visitorChange,

      chartData,
      geoMarkers,

      recentActivities: [
        {
          title: "Google Analytics synced",
          desc: "Traffic data updated from GA4",
          time: "Just now",
          type: "success",
        },
        {
          title: "Search Console synced",
          desc: "Keyword and click data refreshed",
          time: "Just now",
          type: "info",
        },
      ],
    },
  });
});