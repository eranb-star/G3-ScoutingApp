import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({mode}) => ({
  plugins: [react(), ...(mode === 'android' ? [{name:'android-build-marker',generateBundle(){this.emitFile({type:'asset',fileName:'android-build.json',source:JSON.stringify({mode:'android'})});}}] : [])],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
}));
