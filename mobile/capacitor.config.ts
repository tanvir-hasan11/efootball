import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.efootball.league",
  appName: "eFootball League",
  webDir: "www",
  server: {
    // The hosted backend the app loads. Point this at the permanent
    // deployment (e.g. Vercel) once one exists. The current value is the
    // temporary localtunnel to the developer machine.
    url: "https://better-readers-crash.loca.lt",
    cleartext: false,
  },
};

export default config;
