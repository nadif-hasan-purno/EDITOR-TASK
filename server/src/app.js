import express from "express";
import cors from "cors";
import taskRoutes from "./routes/tasks.js";
import customFieldDefinitionRoutes from "./routes/customFieldDefinitions.js";
import editorRoutes from "./routes/editors.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();

/**
 * Always allow local Vite + the production Render frontend.
 * CLIENT_ORIGIN can add more (comma-separated) without replacing these defaults.
 * This avoids production CORS breakage when Render still has CLIENT_ORIGIN=localhost.
 */
const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://editflows-manager-frontend.onrender.com",
];

const envOrigins = String(process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...DEFAULT_ORIGINS, ...envOrigins])];

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser / same-origin tools send no Origin header
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        // Echo the request origin (required when credentials are not used but multiple origins exist)
        callback(null, origin);
        return;
      }

      console.warn(`[cors] Blocked origin: ${origin}. Allowed: ${allowedOrigins.join(", ")}`);
      callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "task-tracker-server" });
});

app.use("/api/tasks", taskRoutes);
app.use("/api/custom-field-definitions", customFieldDefinitionRoutes);
app.use("/api/editors", editorRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
