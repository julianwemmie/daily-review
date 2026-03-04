import { createAuthClient } from "better-auth/react"
import { apiKeyClient, deviceAuthorizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    baseURL: `${import.meta.env.VITE_APP_URL}/auth`,
    plugins: [apiKeyClient(), deviceAuthorizationClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient
