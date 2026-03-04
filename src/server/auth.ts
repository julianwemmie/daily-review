import { betterAuth } from "better-auth";
import { apiKey, bearer, deviceAuthorization } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
    basePath: "/auth",
    database: new Pool({
        connectionString: process.env.DATABASE_URL,
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
    },
    account: {
        accountLinking: {
            enabled: true,
        },
    },
    plugins: [
        apiKey({
            rateLimit: {
                enabled: false,
            },
        }),
        bearer(),
        deviceAuthorization({
            verificationUri: "/device",
        }),
    ],
})
