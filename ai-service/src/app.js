
import express from "express";
import cors from "cors";
import "dotenv/config";

import chatRoutes from "./routes/chat.routes.js";
import { testLaravelConnection } from "./services/laravel.service.js";

const app = express();

// ========================================
// MIDDLEWARE
// ========================================

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Log incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Parse JSON requests
app.use(express.json());

// ========================================
// LARAVEL CONNECTION TEST
// ========================================

app.get("/api/ai/test-laravel", async (req, res) => {
  try {
    const result = await testLaravelConnection();

    res.json({
      success: true,
      message: "Laravel connection successful",
      data: result,
    });
  } catch (error) {
    console.error(
      "Laravel connection error:",
      error.response?.data || error.message
    );

    res.status(error.response?.status || 500).json({
      success: false,
      message: "Laravel API connection failed",
    });
  }
});

// ========================================
// AI CHAT ROUTES
// ========================================

app.use("/api/ai", chatRoutes);


// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`AI Service running on port ${PORT}`);
});
