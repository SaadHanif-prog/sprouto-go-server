const asyncHandler = require("#utils/async-handler");
const { google } = require("googleapis");
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const Site = require("#models/site-model");
const User = require("#models/user-model");

// =========================
// OAUTH CONFIG
// =========================
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
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
  });

  return res.redirect(url);
});

// =========================
// CALLBACK
// =========================
exports.googleCallback = asyncHandler(async (req, res) => {
  const { code } = req.query;

  const { tokens } = await oauth2Client.getToken(code);

  await User.findByIdAndUpdate(req.user.id, {
    googleTokens: tokens,
  });

  return res.redirect("/dashboard");
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

  if (!siteId) {
    return res.status(400).json({
      success: false,
      message: "siteId is required",
    });
  }

  // =========================
  // LOAD SITE + USER
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
  // SET USER TOKENS
  // =========================
  oauth2Client.setCredentials(user.googleTokens);

  // refresh if needed
  await oauth2Client.getAccessToken();

  // =========================
  // GA CLIENT
  // =========================
  const gaClient = new BetaAnalyticsDataClient({
    auth: oauth2Client,
  });

  // =========================
  // GSC CLIENT
  // =========================
  const searchconsole = google.searchconsole({
    version: "v1",
    auth: oauth2Client,
  });

  const { startDate, endDate } = getDateRange();

  // =========================
  // GA: USERS + SESSIONS
  // =========================
  const [gaOverview] = await gaClient.runReport({
    property: `properties/${site.gaPropertyId}`,
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
    ],
  });

  const uniqueVisitors = Number(
    gaOverview.rows?.[0]?.metricValues?.[0]?.value || 0
  );

  // =========================
  // GA: CHART
  // =========================
  const [gaChart] = await gaClient.runReport({
    property: `properties/${site.gaPropertyId}`,
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    dimensions: [{ name: "date" }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
    ],
  });

  const chartData =
    gaChart.rows?.map((row) => ({
      name: row.dimensionValues?.[0]?.value,
      searches: Number(row.metricValues?.[1]?.value || 0),
      clicks: Number(row.metricValues?.[0]?.value || 0),
    })) || [];

  // =========================
  // GA: GEO
  // =========================
  const [geoRes] = await gaClient.runReport({
    property: `properties/${site.gaPropertyId}`,
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    dimensions: [{ name: "city" }],
    metrics: [{ name: "activeUsers" }],
  });

  const geoMarkers =
    geoRes.rows?.slice(0, 5).map((row, i) => ({
      name: row.dimensionValues?.[0]?.value,
      coordinates: [0, 0], // ⚠️ you can map later
      clicks: Number(row.metricValues?.[0]?.value || 0),
      markerOffset: i % 2 === 0 ? -15 : 25,
    })) || [];

  // =========================
  // GSC DATA
  // =========================
  const gscResponse = await searchconsole.searchanalytics.query({
    siteUrl: site.url,
    requestBody: {
      startDate,
      endDate,
    },
  });

  const rows = gscResponse.data.rows || [];

  let totalClicks = 0;
  let totalSearches = 0;

  rows.forEach((r) => {
    totalClicks += r.clicks || 0;
    totalSearches += r.impressions || 0;
  });

  // =========================
  // FINAL RESPONSE
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