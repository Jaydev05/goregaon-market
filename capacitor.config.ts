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
    // Keep Google sign-in inside the app instead of opening Chrome.
    allowNavigation: [
      "goregaon-marketplace.lovable.app",
      "oauth.lovable.app",
      "accounts.google.com",
      "*.google.com",
      "*.supabase.co",
    ],
  },
  android: {
    backgroundColor: "#ffffff",
    // Google refuses sign-in inside app web views; present as mobile Chrome.
    overrideUserAgent:
      "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  },
};

export default config;
