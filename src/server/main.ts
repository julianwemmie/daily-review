import "dotenv/config";
import express from "express";
import ViteExpress from "vite-express";
import { mountRoutes } from "./routes.js";
import { sqliteProvider } from "./sqlite-provider.js";
import { anthropicJudge } from "./anthropic-judge.js";

const app = express();

app.use(express.json());

mountRoutes(app, sqliteProvider, anthropicJudge);

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);
