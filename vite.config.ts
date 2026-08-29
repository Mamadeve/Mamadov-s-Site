import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
plugins: [react(), tailwindcss()],

server: {
allowedHosts: true,
},

resolve: {
alias: {
"@": path.resolve(__dirname, "src"),
},
},

build: {
target: "es2020",
sourcemap: false,
rollupOptions: {
output: {
manualChunks: {
react: ["react", "react-dom", "react-router-dom"],
supabase: ["@supabase/supabase-js"],
motion: ["framer-motion"],
},
},
},
},
});
