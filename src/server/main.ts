import express from "express";
import ViteExpress from "vite-express";
import { mountRoutes } from "./routes.js";

const app = express();

app.use(express.json());

mountRoutes(app);

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);
