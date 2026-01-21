// vite.config.ts
import { defineConfig } from "file:///C:/Users/viro1/Documents/University/4th%20Year/Capstone/MES-Event-Management-System/node_modules/.pnpm/vite@5.4.20_@types+node@20.19.19_terser@5.44.1/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/viro1/Documents/University/4th%20Year/Capstone/MES-Event-Management-System/node_modules/.pnpm/@vitejs+plugin-react@4.7.0__18b874c64b074140ec48352ba8bea55c/node_modules/@vitejs/plugin-react/dist/index.js";
import { TanStackRouterVite } from "file:///C:/Users/viro1/Documents/University/4th%20Year/Capstone/MES-Event-Management-System/node_modules/.pnpm/@tanstack+router-vite-plugi_db6e0e3003fd7ad2574972aa89981a1d/node_modules/@tanstack/router-vite-plugin/dist/esm/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\viro1\\Documents\\University\\4th Year\\Capstone\\MES-Event-Management-System\\src\\web-admin";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    TanStackRouterVite()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 3024,
    proxy: {
      "/api": {
        target: "http://localhost:3124",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "dist/client",
    sourcemap: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aXJvMVxcXFxEb2N1bWVudHNcXFxcVW5pdmVyc2l0eVxcXFw0dGggWWVhclxcXFxDYXBzdG9uZVxcXFxNRVMtRXZlbnQtTWFuYWdlbWVudC1TeXN0ZW1cXFxcc3JjXFxcXHdlYi1hZG1pblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdmlybzFcXFxcRG9jdW1lbnRzXFxcXFVuaXZlcnNpdHlcXFxcNHRoIFllYXJcXFxcQ2Fwc3RvbmVcXFxcTUVTLUV2ZW50LU1hbmFnZW1lbnQtU3lzdGVtXFxcXHNyY1xcXFx3ZWItYWRtaW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3Zpcm8xL0RvY3VtZW50cy9Vbml2ZXJzaXR5LzR0aCUyMFllYXIvQ2Fwc3RvbmUvTUVTLUV2ZW50LU1hbmFnZW1lbnQtU3lzdGVtL3NyYy93ZWItYWRtaW4vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuaW1wb3J0IHsgVGFuU3RhY2tSb3V0ZXJWaXRlIH0gZnJvbSAnQHRhbnN0YWNrL3JvdXRlci12aXRlLXBsdWdpbic7XHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgVGFuU3RhY2tSb3V0ZXJWaXRlKCksXHJcbiAgXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogMzAyNCxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzEyNCcsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBvdXREaXI6ICdkaXN0L2NsaWVudCcsXHJcbiAgICBzb3VyY2VtYXA6IHRydWUsXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBcWUsU0FBUyxvQkFBb0I7QUFDbGdCLE9BQU8sV0FBVztBQUNsQixTQUFTLDBCQUEwQjtBQUNuQyxPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sbUJBQW1CO0FBQUEsRUFDckI7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsRUFDYjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
