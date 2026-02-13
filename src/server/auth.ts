import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
    basePath: "/auth",
    database: new Pool({
        connectionString: process.env.DATABASE_URL,
    }),
    emailAndPassword: {
        enabled: true,
    },
})