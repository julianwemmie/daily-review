import express from "express";
import ViteExpress from "vite-express";
import { mountRoutes } from "./routes.js";
import { sqliteProvider } from "./sqlite-provider.js";

const app = express();

app.use(express.json());

mountRoutes(app, sqliteProvider);

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);
