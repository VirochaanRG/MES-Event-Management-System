import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { AlertTriangle, CircleHelp, X } from "lucide-react";

interface AlertItem {
  id: number;
  message: string;
}

type DialogItem =
  | {
      id: number;
      kind: "alert";
      message: string;
    }
  | {
      id: number;
      kind: "confirm";
      message: string;
      resolve: (value: boolean) => void;
    };

interface CustomAlertContextValue {
  showAlert: (message: string) => void;
  showConfirm: (message: string) => Promise<boolean>;
}

const CustomAlertContext = createContext<CustomAlertContextValue | null>(null);

function CustomAlert({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/35 px-4 pb-8 pt-20 backdrop-blur-sm sm:items-center sm:pb-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-white px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900">Heads up</h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">{message}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
              aria-label="Close alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex justify-end px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomConfirm({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/35 px-4 pb-8 pt-20 backdrop-blur-sm sm:items-center sm:pb-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="bg-gradient-to-r from-sky-50 via-cyan-50 to-white px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-800">
              <CircleHelp className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Please confirm
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">{message}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
              aria-label="Close confirmation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomAlertProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<DialogItem[]>([]);

  const showAlert = (message: string) => {
    setQueue((current) => [
      ...current,
      {
        id: Date.now() + current.length,
        kind: "alert",
        message,
      },
    ]);
  };

  const showConfirm = (message: string) => {
    return new Promise<boolean>((resolve) => {
      setQueue((current) => [
        ...current,
        {
          id: Date.now() + current.length,
          kind: "confirm",
          message,
          resolve,
        },
      ]);
    });
  };

  const dismissAlert = () => {
    setQueue((current) => current.slice(1));
  };

  const resolveConfirm = (value: boolean) => {
    const activeDialog = queue[0];
    if (activeDialog?.kind === "confirm") {
      activeDialog.resolve(value);
    }
    setQueue((current) => current.slice(1));
  };

  const contextValue = useMemo(
    () => ({
      showAlert,
      showConfirm,
    }),
    [],
  );

  const activeDialog = queue[0] ?? null;

  return (
    <CustomAlertContext.Provider value={contextValue}>
      {children}
      {activeDialog?.kind === "alert" ? (
        <CustomAlert message={activeDialog.message} onClose={dismissAlert} />
      ) : null}
      {activeDialog?.kind === "confirm" ? (
        <CustomConfirm
          message={activeDialog.message}
          onCancel={() => resolveConfirm(false)}
          onConfirm={() => resolveConfirm(true)}
        />
      ) : null}
    </CustomAlertContext.Provider>
  );
}

export function useCustomAlert() {
  const context = useContext(CustomAlertContext);

  if (!context) {
    throw new Error("useCustomAlert must be used within a CustomAlertProvider");
  }

  return context;
}

export function useCustomConfirm() {
  const context = useContext(CustomAlertContext);

  if (!context) {
    throw new Error(
      "useCustomConfirm must be used within a CustomAlertProvider",
    );
  }

  return context.showConfirm;
}
