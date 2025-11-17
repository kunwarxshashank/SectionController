// Edge runtime compatible auth utilities using Web Crypto API
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key"

// Convert string to ArrayBuffer
function stringToArrayBuffer(str) {
    const encoder = new TextEncoder()
    return encoder.encode(str)
}

// Convert ArrayBuffer to base64url
function arrayBufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

// Convert base64url to ArrayBuffer
function base64UrlToArrayBuffer(base64url) {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes // Return Uint8Array directly instead of .buffer
}

export async function verifyTokenEdge(token) {
    try {
        console.log("[v0] Edge: Verifying token:", token ? "token exists" : "no token")

        if (!token) {
            console.log("[v0] Edge: No token provided")
            return null
        }

        const parts = token.split(".")
        if (parts.length !== 3) {
            console.log("[v0] Edge: Invalid token format")
            return null
        }

        const [headerB64, payloadB64, signatureB64] = parts

        // Decode payload
        const payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
        const payload = JSON.parse(payloadJson)

        // Check expiration
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            console.log("[v0] Edge: Token expired")
            return null
        }

        // Create the signing input (header.payload)
        const signingInput = `${headerB64}.${payloadB64}`
        const encoder = new TextEncoder()
        const data = encoder.encode(signingInput)

        // Import the secret key
        const keyData = encoder.encode(JWT_SECRET)
        const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"])

        const signatureBytes = base64UrlToArrayBuffer(signatureB64)

        // Verify the signature
        const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, data)

        if (!isValid) {
            console.log("[v0] Edge: Invalid signature")
            return null
        }

        console.log("[v0] Edge: Token verified successfully:", payload)
        return payload
    } catch (error) {
        console.log("[v0] Edge: Token verification failed:", error.message)
        return null
    }
}

export function getTokenFromRequestEdge(request) {
    const authHeader = request.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
        console.log("[v0] Edge: Found token in Authorization header")
        return authHeader.substring(7)
    }

    // Also check cookies
    const cookies = request.headers.get("cookie")
    console.log("[v0] Edge: Cookies:", cookies)
    if (cookies) {
        const tokenCookie = cookies.split(";").find((c) => c.trim().startsWith("auth-token="))
        if (tokenCookie) {
            const token = tokenCookie.split("=")[1]
            console.log("[v0] Edge: Found token in cookies:", token ? "token exists" : "no token")
            return token
        }
    }

    console.log("[v0] Edge: No token found in request")
    return null
}
