import type { CapacitorConfig } from "@capacitor/cli";

// The store is server-rendered, so the Android app loads the live site (server.url).
// Points at the published store address.
const config: CapacitorConfig = {
  appId: "com.goregaonmart.app",
  appName: "Goregaon Mart",
  webDir: "dist",
  server: {
    url: "https://goregaon-marketplace.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#ffffff",
  },
};

export default config;
