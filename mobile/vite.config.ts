import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  // The shared ../lib code reads optional settings from process.env; none are needed on the phone.
  define: { "process.env": "{}" },
  build: { outDir: "dist", emptyOutDir: true },
});
