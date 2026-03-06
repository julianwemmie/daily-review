import "dotenv/config";
import express from "express";
import ViteExpress from "vite-express";
import { auth } from "./auth.js";
import { toNodeHandler } from 'better-auth/node'
import { mountRoutes } from "./routes.js";
import { supabaseProvider } from "./db/supabase-provider.js";
import { anthropicGrader } from "./grader/anthropic.js";
import { createWhisperProvider } from "./stt/whisper.js";
import { requireAuth } from "./middleware/auth.js";
import { startEmailNotificationCron, mountUnsubscribeRoute } from "./email-notifications.js";

const port = Number(process.env.PORT) || 3000;

const app = express();
app.all('/auth/{*any}', toNodeHandler(auth));

// Raw body parsing for the audio transcription endpoint (before express.json)
app.use("/api/transcribe", express.raw({ type: "audio/*", limit: "10mb" }));

app.use(express.json({ limit: '1mb' }));

// Unauthenticated routes (before requireAuth)
mountUnsubscribeRoute(app, supabaseProvider);

app.use("/api", requireAuth);

const whisperProvider = createWhisperProvider();
mountRoutes(app, supabaseProvider, anthropicGrader, whisperProvider);

// Start the daily email notification cron job
startEmailNotificationCron();

ViteExpress.config({ ignorePaths: /^\/(auth|api)(\/|$)/ });
ViteExpress.listen(app, port, () =>
  console.log(`Server is listening on port ${port}...`),
);
