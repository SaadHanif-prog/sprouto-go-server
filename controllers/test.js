const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const { google } = require("googleapis");

// =========================
// CONFIG
// =========================
const PROPERTY_ID = "530481018";
const SITE_URL = "https://software.theaidetective.com/chat";
const keyFile = "config/google-service-account.json";

// =========================
// GA CLIENT
// =========================
const gaClient = new BetaAnalyticsDataClient({
  keyFilename: keyFile,
});

// =========================
// GSC CLIENT
// =========================
const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});

const searchconsole = google.searchconsole({
  version: "v1",
  auth,
});

// =========================
// DATE HELPER (FIX FOR GSC)
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
// TEST FUNCTION
// =========================
const testAiStats = async () => {
  try {
    const { startDate, endDate } = getDateRange();

    console.log("\n=== DATE RANGE ===");
    console.log({ startDate, endDate });

    // =========================
    // GA: OVERVIEW
    // =========================
    const [overview] = await gaClient.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
      ],
    });

    const users = Number(
      overview.rows?.[0]?.metricValues?.[0]?.value || 0
    );

    console.log("\n=== USERS ===");
    console.log(users);

    // =========================
    // GA: CHART DATA
    // =========================
    const [chartResponse] = await gaClient.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
      ],
    });

    const chartData =
      chartResponse.rows?.map((row) => ({
        date: row.dimensionValues?.[0]?.value,
        users: Number(row.metricValues?.[0]?.value || 0),
        sessions: Number(row.metricValues?.[1]?.value || 0),
      })) || [];

    console.log("\n=== CHART CLEAN ===");
    console.dir(chartData, { depth: null });

    // =========================
    // GA: GEO DATA
    // =========================
    const [geoResponse] = await gaClient.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "city" }],
      metrics: [{ name: "activeUsers" }],
    });

    const geoData =
      geoResponse.rows?.map((row) => ({
        city: row.dimensionValues?.[0]?.value,
        users: Number(row.metricValues?.[0]?.value || 0),
      })) || [];

    console.log("\n=== GEO CLEAN ===");
    console.dir(geoData, { depth: null });

    // =========================
    // GSC: SEARCH DATA (FIXED)
    // =========================
    const authClient = await auth.getClient();

    const gscResponse = await searchconsole.searchanalytics.query({
      auth: authClient,
      siteUrl: SITE_URL,
      requestBody: {
        startDate, // ✅ FIXED
        endDate,   // ✅ FIXED
      },
    });

    const gscRows = gscResponse.data.rows || [];

    console.log("\n=== GSC CLEAN ===");
    console.dir(gscRows, { depth: null });

    // =========================
    // PROCESS GSC
    // =========================
    let totalClicks = 0;
    let totalSearches = 0;

    gscRows.forEach((row) => {
      totalClicks += row.clicks || 0;
      totalSearches += row.impressions || 0;
    });

    console.log("\n=== TOTALS ===");
    console.log({
      totalClicks,
      totalSearches,
    });

  } catch (error) {
    console.error("\n❌ ERROR FULL:");
    console.error(error);
  }
};

// =========================
// RUN TEST
// =========================
testAiStats();