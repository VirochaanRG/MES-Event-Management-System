import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { CustomAlertProvider } from "../components/CustomAlert";

export const Route = createRootRoute({
  component: () => (
    <CustomAlertProvider>
      <div className="min-h-screen bg-white">
        <main className="m-0 p-0">
          <Outlet />
        </main>
      </div>
      {process.env.NODE_ENV === "development" && <TanStackRouterDevtools />}
    </CustomAlertProvider>
  ),
});
