import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { AlertCircle, HelpCircle, X } from "lucide-react";

interface AlertItem {
  id: number;
  message: string;
}

interface ConfirmItem {
  id: number;
  message: string;
  resolve: (value: boolean) => void;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl">
        <div className="flex items-start gap-4 border-b border-red-100 bg-red-50 px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-800">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-stone-900">Notice</h2>
            <p className="mt-1 text-sm leading-6 text-stone-700">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-stone-400 transition-colors hover:bg-white hover:text-stone-700"
            aria-label="Close alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-red-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-950"
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl">
        <div className="flex items-start gap-4 border-b border-amber-100 bg-amber-50 px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-stone-900">
              Confirm action
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-700">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-stone-400 transition-colors hover:bg-white hover:text-stone-700"
            aria-label="Close confirmation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-950"
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
