const asyncHandler = require("#utils/async-handler");
const { google } = require("googleapis");

const Site = require("#models/site.model");
const User = require("#models/user.model");

console.log("URLLLLLLLLLLLL", process.env.GOOGLE_REDIRECT_URI)

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
  console.log("➡️ Redirecting user to Google OAuth");

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: req.user.id,
  });

  return res.redirect(url);
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

  console.log("📊 SITE:", site);
  console.log("👤 TOKENS:", user?.googleTokens);

  if (!site || !user?.googleTokens) {
    return res.status(400).json({
      success: false,
      message: "Google not connected or site missing",
    });
  }

  // =========================
  // AUTH SETUP
  // =========================
  oauth2Client.setCredentials(user.googleTokens);

  const accessToken = await oauth2Client.getAccessToken();
  console.log("🔑 Access Token:", accessToken?.token);

  // =========================
  // INIT APIs (REST)
  // =========================
  const analyticsData = google.analyticsdata("v1beta");

  const searchconsole = google.searchconsole({
    version: "v1",
    auth: oauth2Client,
  });

  const { startDate, endDate } = getDateRange();

  console.log("📅 Date range:", { startDate, endDate });
  console.log("📌 GA Property ID:", site.gaPropertyId);
  if (!site.gaPropertyId) {
    return res
      .status(404)
      .json({ success: false, message: "GA property id is missing" });
  }

  // =========================
  // GA: OVERVIEW
  // =========================
  let uniqueVisitors = 0;

  try {
    console.log("➡️ Fetching GA overview...");

    const gaOverviewRes = await analyticsData.properties.runReport({
      property: `properties/${site.gaPropertyId}`,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      },
      auth: oauth2Client,
    });

    console.log("✅ GA Overview:", gaOverviewRes.data);

    uniqueVisitors = Number(
      gaOverviewRes.data.rows?.[0]?.metricValues?.[0]?.value || 0,
    );
  } catch (err) {
    console.error("❌ GA OVERVIEW ERROR:", err.response?.data || err);
    throw err;
  }

  // =========================
  // GA: CHART
  // =========================
  let chartData = [];

  try {
    console.log("➡️ Fetching GA chart...");

    const gaChartRes = await analyticsData.properties.runReport({
      property: `properties/${site.gaPropertyId}`,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      },
      auth: oauth2Client,
    });

    console.log("✅ GA Chart:", gaChartRes.data);

    chartData =
      gaChartRes.data.rows?.map((row) => ({
        name: row.dimensionValues?.[0]?.value,
        searches: Number(row.metricValues?.[1]?.value || 0),
        clicks: Number(row.metricValues?.[0]?.value || 0),
      })) || [];
  } catch (err) {
    console.error("❌ GA CHART ERROR:", err.response?.data || err);
    throw err;
  }

  // =========================
  // GA: GEO
  // =========================
  let geoMarkers = [];

  try {
    console.log("➡️ Fetching GA geo...");

    const geoRes = await analyticsData.properties.runReport({
      property: `properties/${site.gaPropertyId}`,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "city" }],
        metrics: [{ name: "activeUsers" }],
      },
      auth: oauth2Client,
    });

    console.log("✅ GA Geo:", geoRes.data);

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
  // GSC DATA
  // =========================
  console.log("➡️ Fetching Search Console...");

  const normalizeDomainProperty = (url) => {
    return `sc-domain:${url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")}`;
  };

  const gscResponse = await searchconsole.searchanalytics.query({
    siteUrl: normalizeDomainProperty(site.url),
    requestBody: {
      startDate,
      endDate,
    },
  });
  console.log("✅ GSC:", gscResponse.data);

  const rows = gscResponse.data.rows || [];

  let totalClicks = 0;
  let totalSearches = 0;

  rows.forEach((r) => {
    totalClicks += r.clicks || 0;
    totalSearches += r.impressions || 0;
  });

  console.log("📈 Final:", {
    totalClicks,
    totalSearches,
    uniqueVisitors,
  });

  // =========================
  // RESPONSE
  // =========================
  return res.status(200).json({
    success: true,
    data: {
      totalSearches,
      totalClicks,
      uniqueVisitors,

      searchChange: "+0%",
      clickChange: "+0%",
      visitorChange: "+0%",

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
