import { createAuthClient } from "better-auth/react"

export const { signIn, signUp, signOut, useSession } = createAuthClient({
    baseURL: `${import.meta.env.VITE_APP_URL}/auth`
})