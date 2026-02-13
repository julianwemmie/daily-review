import { createAuthClient } from "better-auth/react"
import { apiKeyClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    baseURL: `${import.meta.env.VITE_APP_URL}/auth`,
    plugins: [apiKeyClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient