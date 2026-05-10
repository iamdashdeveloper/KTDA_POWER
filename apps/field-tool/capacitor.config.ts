import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.ktpc.field",
  appName: "field-tool",
  webDir: "dist",
   server: {
     url: "http://192.168.100.157:5174",
     androidScheme: "https",
    cleartext: true
  },
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
