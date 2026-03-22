import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ThreeDot } from "react-loading-indicators";

export const Route = createFileRoute("/payment-result")({
  validateSearch: (search: Record<string, unknown>) => ({
    status:
      search.status === "success" || search.status === "cancelled"
        ? search.status
        : undefined,
    event_id: typeof search.event_id === "string" ? search.event_id : undefined,
    session_id:
      typeof search.session_id === "string" ? search.session_id : undefined,
    registration_id:
      typeof search.registration_id === "string"
        ? search.registration_id
        : undefined,
  }),
  component: PaymentResultPage,
});

function PaymentResultPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [state, setState] = useState<
    "loading" | "success" | "error" | "cancelled"
  >("loading");
  const [message, setMessage] = useState("Finalizing your payment...");
  const [resolvedEventId, setResolvedEventId] = useState<string | null>(null);
  const handledRef = useRef(false);

  const getStoredUserEmail = () => {
    if (typeof window === "undefined") return undefined;

    try {
      const raw = sessionStorage.getItem("teamd-auth-user");
      if (!raw) return undefined;

      const parsed = JSON.parse(raw) as { email?: string };
      return typeof parsed.email === "string" && parsed.email.trim()
        ? parsed.email.trim().toLowerCase()
        : undefined;
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    const finalizePayment = async () => {
      if (handledRef.current) return;
      handledRef.current = true;

      if (search.status === "cancelled") {
        setState("cancelled");
        setMessage("Payment was cancelled. Your registration remains pending.");
        return;
      }

      if (search.status !== "success" || !search.session_id) {
        setState("error");
        setMessage(
          "Missing payment details. Please try again from the event page.",
        );
        return;
      }

      const requestBody: {
        registrationId?: number;
        sessionId: string;
        userEmail?: string;
        eventId?: number;
      } = {
        sessionId: search.session_id,
      };

      if (search.registration_id) {
        const parsedRegistrationId = Number(search.registration_id);
        if (Number.isFinite(parsedRegistrationId) && parsedRegistrationId > 0) {
          requestBody.registrationId = parsedRegistrationId;
        }
      }

      if (search.event_id) {
        const parsedEventId = Number(search.event_id);
        if (Number.isFinite(parsedEventId) && parsedEventId > 0) {
          requestBody.eventId = parsedEventId;
        }
      }

      const storedUserEmail = getStoredUserEmail();
      if (storedUserEmail) {
        requestBody.userEmail = storedUserEmail;
      }

      try {
        const response = await fetch(`/api/payments/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to confirm payment");
        }

        const returnedEventId = result?.data?.registration?.eventId;
        if (returnedEventId) {
          setResolvedEventId(String(returnedEventId));
        }

        setState("success");
        setMessage("Payment successful. Your registration is confirmed.");
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to confirm payment.";
        setState("error");
        setMessage(errorMessage);
      }
    };

    void finalizePayment();
  }, [
    search.status,
    search.event_id,
    search.session_id,
    search.registration_id,
  ]);

  const goToEvent = () => {
    const eventIdToUse = resolvedEventId || search.event_id;

    if (eventIdToUse) {
      navigate({
        to: "/events/$eventId",
        params: { eventId: eventIdToUse },
      });
      return;
    }

    navigate({
      to: "/",
      search: { tab: "events", eventsSubTab: "available" },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-amber-50 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border-t-4 border-rose-900 p-8 text-center">
        <h1 className="text-2xl font-bold text-rose-900 mb-4">
          Payment Status
        </h1>

        {state === "loading" ? (
          <div className="flex flex-col items-center gap-3">
            <ThreeDot color="#78350f" size="small" text="" textColor="" />
            <p className="text-gray-700">{message}</p>
          </div>
        ) : (
          <>
            <p
              className={`mb-6 font-medium ${
                state === "success"
                  ? "text-green-700"
                  : state === "cancelled"
                    ? "text-amber-700"
                    : "text-rose-700"
              }`}
            >
              {message}
            </p>
            <button
              onClick={goToEvent}
              className="px-6 py-3 bg-rose-900 text-amber-300 font-semibold rounded-lg hover:bg-rose-800 transition-colors"
            >
              Back to Event
            </button>
          </>
        )}
      </div>
    </div>
  );
}
