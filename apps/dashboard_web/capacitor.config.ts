// apps/dashboard_web/capacitor.config.ts

type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  server?: {
    url?: string;
    cleartext?: boolean;
    allowNavigation?: string[];
  };
};

const config: CapacitorConfig = {
  appId: "com.g3.scouting",
  appName: "G3 Scouting",
  webDir: "dist",
  bundledWebRuntime: false,
};

export default config;
