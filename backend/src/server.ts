// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter, traceRouter, assetRouter, inventoryRouter } from "./routes/index";
import { errorHandler } from "./middleware/index";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) =>
    res.json({ status: "ok", service: "trace-api", ts: new Date().toISOString() })
  );

  app.use("/api/auth",      authRouter);
  app.use("/api/trace",     traceRouter);
  app.use("/api/assets",    assetRouter);
  app.use("/api/inventory", inventoryRouter);

  app.use((_req, res) =>
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Rota não encontrada." } })
  );

  app.use(errorHandler);
  return app;
}

// src/server.ts
const PORT = Number(process.env.PORT ?? 3333);
createApp().listen(PORT, () => {
  console.log(`[TRACE] API → http://localhost:${PORT}`);
  console.log(`[TRACE] Health → http://localhost:${PORT}/health`);
});
