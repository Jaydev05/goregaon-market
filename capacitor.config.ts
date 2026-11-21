import type { CapacitorConfig } from "@capacitor/cli";

// The store is server-rendered, so the Android app loads the live site (server.url).
// Point it at your published address once the app is published.
const config: CapacitorConfig = {
  appId: "com.goregaonmarket.app",
  appName: "Goregaon Market",
  webDir: "dist",
  server: {
    url: "https://id-preview--e2d81eac-ea9f-41a3-9e49-bba8d4cff146.lovable.app?forceHideBadge=true",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#ffffff",
  },
};

export default config;
