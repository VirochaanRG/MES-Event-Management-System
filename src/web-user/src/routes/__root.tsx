import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { AuthProvider } from "../contexts/AuthContext";
import { CustomAlertProvider } from "../components/CustomAlert";

export const Route = createRootRoute({
  component: () => (
    <CustomAlertProvider>
      <AuthProvider>
        <Outlet />
        {process.env.NODE_ENV === "development" && <TanStackRouterDevtools />}
      </AuthProvider>
    </CustomAlertProvider>
  ),
});
