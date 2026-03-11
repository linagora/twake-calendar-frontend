import { useEffect, useRef } from "react";

interface UseEventUpdateModalReopenProps {
  open: boolean;
  eventId: string;
  calId: string;
  typeOfAction: "solo" | "all" | undefined;
  setTypeOfAction: (type: "solo" | "all" | undefined) => void;
  setOpenUpdateModal: (open: boolean) => void;
  setHidePreview: (hide: boolean) => void;
}

function applyReopenData(
  data: { typeOfAction?: "solo" | "all"; eventId: string; calId: string },
  eventId: string,
  calId: string,
  typeOfAction: "solo" | "all" | undefined,
  setTypeOfAction: (type: "solo" | "all" | undefined) => void,
  setOpenUpdateModal: (open: boolean) => void,
  setHidePreview: (hide: boolean) => void,
  delayMs = 100,
  clearSessionStorage = false
) {
  const typeOfActionMatch =
    data.typeOfAction === typeOfAction ||
    data.typeOfAction === undefined ||
    typeOfAction === undefined;

  if (data.eventId !== eventId || data.calId !== calId || !typeOfActionMatch) {
    return false;
  }

  const delay =
    data.typeOfAction !== undefined && typeOfAction === undefined
      ? 50
      : delayMs;

  if (data.typeOfAction !== undefined && typeOfAction === undefined) {
    setTypeOfAction(data.typeOfAction);
  }

  setTimeout(() => {
    setOpenUpdateModal(true);
    setHidePreview(true);
    if (clearSessionStorage) {
      try {
        sessionStorage.removeItem("eventUpdateModalReopen");
      } catch {
        // Ignore sessionStorage errors
      }
    }
  }, delay);

  return true;
}

function readSessionStorage(): {
  typeOfAction?: "solo" | "all";
  eventId: string;
  calId: string;
} | null {
  try {
    const stored = sessionStorage.getItem("eventUpdateModalReopen");
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Handles re-opening the EventUpdateModal after a page navigation or API failure.
 * Reads state from sessionStorage (for page reloads) and a custom DOM event
 * (for in-session failures without reload).
 */
export function useEventUpdateModalReopen({
  open,
  eventId,
  calId,
  typeOfAction,
  setTypeOfAction,
  setOpenUpdateModal,
  setHidePreview,
}: UseEventUpdateModalReopenProps) {
  const hasCheckedSessionStorageRef = useRef(false);

  // Check sessionStorage once when the preview opens
  useEffect(() => {
    if (!open) {
      hasCheckedSessionStorageRef.current = false;
      return;
    }

    if (hasCheckedSessionStorageRef.current) return;
    hasCheckedSessionStorageRef.current = true;

    const data = readSessionStorage();
    if (data) {
      applyReopenData(
        data,
        eventId,
        calId,
        typeOfAction,
        setTypeOfAction,
        setOpenUpdateModal,
        setHidePreview,
        100,
        true
      );
    }
    // typeOfAction intentionally omitted — we only want to run this once per open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId, calId]);

  // Listen for the custom event dispatched on API failure
  useEffect(() => {
    const handleUpdateModalReopen = (e: CustomEvent) => {
      const detail = e.detail;
      const matched = applyReopenData(
        detail,
        eventId,
        calId,
        typeOfAction,
        setTypeOfAction,
        setOpenUpdateModal,
        setHidePreview,
        50,
        true
      );
      if (matched) {
        try {
          sessionStorage.removeItem("eventUpdateModalReopen");
        } catch {
          // Ignore
        }
      }
    };

    // Also check sessionStorage whenever eventId/calId/typeOfAction change
    const data = readSessionStorage();
    if (data) {
      applyReopenData(
        data,
        eventId,
        calId,
        typeOfAction,
        setTypeOfAction,
        setOpenUpdateModal,
        setHidePreview,
        100,
        true
      );
    }

    window.addEventListener(
      "eventUpdateModalReopen",
      handleUpdateModalReopen as EventListener
    );
    return () => {
      window.removeEventListener(
        "eventUpdateModalReopen",
        handleUpdateModalReopen as EventListener
      );
    };
  }, [
    eventId,
    calId,
    typeOfAction,
    setTypeOfAction,
    setOpenUpdateModal,
    setHidePreview,
  ]);
}
