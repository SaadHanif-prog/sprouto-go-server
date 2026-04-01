// Main Packages
const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Configurations
const CONNECT_DATABASE = require("#config/db-connect");
const getCorsOptions = require("#config/cors-config");

//Routes
const router = require("#routes/index.routes");
const stripeRouter = require("#routes/webhook.route")
const initSocket = require("#controllers/socket.controller"); 


//Error Handler
const { handleGeneralErrors } = require("#utils/error-handlers");

// const test = require("#controllers/test")

/*********************************************** Imports On Top ***********************************************/

const PORT = process.env.PORT || 5000;
const app = express();

// Middlewares
app.use(cors(getCorsOptions()));
app.use(cookieParser());

// STRIPE WEBHOOK FIRST
app.use(
  "/api/v1/webhook",
  express.raw({ type: "application/json" }),
  stripeRouter
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/v1", router);

// 404 handler
app.use((_, res) => {
  res
    .status(404)
    .json({ success: false, message: "Route not found", data: null });
});

// General error handler
app.use(handleGeneralErrors);


// Connect database first then run the server
const startServer = async () => {
  await CONNECT_DATABASE();

  const httpServer = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  // Attach socket AFTER server starts
  initSocket(httpServer);
};

startServer();
