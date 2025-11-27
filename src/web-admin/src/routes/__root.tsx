import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="min-h-screen bg-gray-100">
        <main className="m-0 p-0">
          <Outlet />
        </main>
      </div>
      {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
    </>
  ),
});
