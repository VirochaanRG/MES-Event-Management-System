// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/viro1/Documents/University/4th%20Year/Capstone/MES-Event-Management-System/node_modules/.pnpm/vite@5.4.20_@types+node@20.19.19_terser@5.44.1/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/viro1/Documents/University/4th%20Year/Capstone/MES-Event-Management-System/node_modules/.pnpm/@vitejs+plugin-react@4.7.0__18b874c64b074140ec48352ba8bea55c/node_modules/@vitejs/plugin-react/dist/index.js";
import { TanStackRouterVite } from "file:///C:/Users/viro1/Documents/University/4th%20Year/Capstone/MES-Event-Management-System/node_modules/.pnpm/@tanstack+router-vite-plugi_db6e0e3003fd7ad2574972aa89981a1d/node_modules/@tanstack/router-vite-plugin/dist/esm/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\viro1\\Documents\\University\\4th Year\\Capstone\\MES-Event-Management-System\\src\\web-user";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
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
      port: 3014,
      proxy: {
        "/api": {
          target: "http://localhost:3114",
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: "dist/client",
      sourcemap: true
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aXJvMVxcXFxEb2N1bWVudHNcXFxcVW5pdmVyc2l0eVxcXFw0dGggWWVhclxcXFxDYXBzdG9uZVxcXFxNRVMtRXZlbnQtTWFuYWdlbWVudC1TeXN0ZW1cXFxcc3JjXFxcXHdlYi11c2VyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aXJvMVxcXFxEb2N1bWVudHNcXFxcVW5pdmVyc2l0eVxcXFw0dGggWWVhclxcXFxDYXBzdG9uZVxcXFxNRVMtRXZlbnQtTWFuYWdlbWVudC1TeXN0ZW1cXFxcc3JjXFxcXHdlYi11c2VyXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy92aXJvMS9Eb2N1bWVudHMvVW5pdmVyc2l0eS80dGglMjBZZWFyL0NhcHN0b25lL01FUy1FdmVudC1NYW5hZ2VtZW50LVN5c3RlbS9zcmMvd2ViLXVzZXIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuaW1wb3J0IHsgVGFuU3RhY2tSb3V0ZXJWaXRlIH0gZnJvbSAnQHRhbnN0YWNrL3JvdXRlci12aXRlLXBsdWdpbic7XHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgJycpO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICByZWFjdCgpLFxyXG4gICAgICBUYW5TdGFja1JvdXRlclZpdGUoKSxcclxuICAgIF0sXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgcG9ydDogMzAxNCxcclxuICAgICAgcHJveHk6IHtcclxuICAgICAgICAnL2FwaSc6IHtcclxuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzExNCcsXHJcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICBvdXREaXI6ICdkaXN0L2NsaWVudCcsXHJcbiAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcclxuICAgIH0sXHJcbiAgfTtcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBa2UsU0FBUyxjQUFjLGVBQWU7QUFDeGdCLE9BQU8sV0FBVztBQUNsQixTQUFTLDBCQUEwQjtBQUNuQyxPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBRTNDLFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLG1CQUFtQjtBQUFBLElBQ3JCO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDdEM7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsVUFDTixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsUUFDaEI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLE1BQ1IsV0FBVztBQUFBLElBQ2I7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
