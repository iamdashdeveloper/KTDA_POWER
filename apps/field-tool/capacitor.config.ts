import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.ktpc.field",
  appName: "field-tool",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // Important: We will hide it manually in React
      backgroundColor: "#ffffff",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
}

export default config
