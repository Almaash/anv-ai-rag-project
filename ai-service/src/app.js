import express from "express";
import cors from "cors";
import "dotenv/config";
import chatRoutes from "./routes/chat.routes.js";
import { db } from "./db/index.js";
import { conversations } from "./db/schema.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "100kb",
  })
);

// ========================================
// ROOT HEALTH CHECK
// ========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Anavaran AI Service is running",
  });
});

// ========================================
// AI ROUTES
// ========================================

app.use("/api/ai", chatRoutes);

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`AI Service running on port ${PORT}`);
});