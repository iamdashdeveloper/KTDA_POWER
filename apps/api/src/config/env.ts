import dotenv from "dotenv"

dotenv.config()

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key]
  if (!value && !defaultValue) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value || defaultValue!
}

export const env = {
  // Database
  DATABASE_URL: getEnv("DATABASE_URL"),

  // Server
  PORT: parseInt(getEnv("PORT", "3001"), 10),
  HOST: getEnv("HOST", "0.0.0.0"),
  NODE_ENV: getEnv("NODE_ENV", "development"),

  // JWT
  JWT_SECRET: getEnv(
    "JWT_SECRET",
    "your-super-secret-key-change-in-production"
  ),
  JWT_EXPIRATION: getEnv("JWT_EXPIRATION", "7d"),

  // CORS
  CORS_ORIGIN: getEnv("CORS_ORIGIN", "http://localhost:5173,http://localhost:5175"),
}

export default env
