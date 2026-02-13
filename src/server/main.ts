import "dotenv/config";
import express from "express";
import ViteExpress from "vite-express";
import { mountRoutes } from "./routes.js";
import { sqliteProvider } from "./db/sqlite-provider.js";
import { anthropicGrader } from "./grader/anthropic.js";

const app = express();

app.use(express.json({ limit: '1mb' }));

mountRoutes(app, sqliteProvider, anthropicGrader);

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);
