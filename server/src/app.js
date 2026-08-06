import express from "express";
import cors from "cors";
import taskRoutes from "./routes/tasks.js";
import customFieldDefinitionRoutes from "./routes/customFieldDefinitions.js";
import editorRoutes from "./routes/editors.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();

/**
 * Always allow local Vite + known production frontends.
 * CLIENT_ORIGIN can add more (comma-separated) without replacing these defaults.
 * Also allows any https://editor-task*.onrender.com host so renames don't break CORS.
 */
const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "https://editflows-manager-frontend.onrender.com",
  "https://editor-task-1.onrender.com",
  "https://editor-task.onrender.com",
];

const envOrigins = String(process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...DEFAULT_ORIGINS, ...envOrigins])];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return true;

  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "https:" && protocol !== "http:") return false;
    // Render frontends for this product (editor-task, editor-task-1, editor-task-frontend, …)
    if (
      hostname.endsWith(".onrender.com")
      && (hostname.startsWith("editor-task") || hostname.includes("editflows-manager"))
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser / same-origin tools send no Origin header
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isAllowedOrigin(origin)) {
        // Echo the request origin so multi-origin allowlists work in browsers
        callback(null, origin);
        return;
      }

      console.warn(`[cors] Blocked origin: ${origin}. Allowed: ${allowedOrigins.join(", ")} (+ editor-task*.onrender.com)`);
      callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Authorization"],
    optionsSuccessStatus: 204,
    maxAge: 86400,
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
