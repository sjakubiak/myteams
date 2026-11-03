import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sjakubiak.myteams",
  appName: "My Teams",
  webDir: "dist",
  backgroundColor: "#0f1216",
  plugins: {
    // Routes fetch() through Android's native HTTP, so the sports and news feeds work without CORS.
    CapacitorHttp: { enabled: true },
    LocalNotifications: { smallIcon: "ic_stat_notify", iconColor: "#1A73E8" },
  },
};

export default config;
