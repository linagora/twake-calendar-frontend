import { useAppDispatch } from "@/app/hooks";
import { PartStat } from "@/features/User/models/attendee";
import { userData } from "@/features/User/userDataTypes";
import { Button, CircularProgress } from "@linagora/twake-mui";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useI18n } from "twake-i18n";
import { ContextualizedEvent } from "../EventsTypes";
import { handleRSVPClick } from "./handleRSVPClick";

const rsvpColor: Record<PartStat, "success" | "error" | "warning" | "primary"> =
  {
    ACCEPTED: "success",
    DECLINED: "error",
    TENTATIVE: "warning",
    "NEEDS-ACTION": "primary",
  } as const;

interface RSVPButtonProps {
  rsvpValue: PartStat;
  contextualizedEvent: ContextualizedEvent;
  user: userData | undefined;
  setAfterChoiceFunc: Dispatch<SetStateAction<Function | undefined>>;
  setOpenEditModePopup: Dispatch<SetStateAction<string | null>>;
  isLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

export function RSVPButton({
  rsvpValue,
  contextualizedEvent,
  user,
  setAfterChoiceFunc,
  setOpenEditModePopup,
  isLoading,
  onLoadingChange,
}: RSVPButtonProps) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const { currentUserAttendee } = contextualizedEvent;
  const [showLoading, setShowLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const fallbackTimeoutRef = useRef<NodeJS.Timeout>();
  const previousPartstatRef = useRef<PartStat | undefined>(
    currentUserAttendee?.partstat
  );

  useEffect(() => {
    if (isLoading) {
      // Start a 2-second timer for showing loading indicator
      loadingTimeoutRef.current = setTimeout(() => {
        setShowLoading(true);
      }, 2000);
    } else {
      // Clear timeouts and hide loading
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      setShowLoading(false);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, [isLoading, rsvpValue, onLoadingChange]);

  // Detect when attendee status changes (via WebSocket) and clear loading
  useEffect(() => {
    const currentPartstat = currentUserAttendee?.partstat;

    if (
      isLoading &&
      previousPartstatRef.current !== undefined &&
      currentPartstat !== previousPartstatRef.current
    ) {
      onLoadingChange(false);
    }

    previousPartstatRef.current = currentPartstat;
  }, [currentUserAttendee?.partstat, isLoading, rsvpValue, onLoadingChange]);

  const handleClick = async () => {
    const startTime = performance.now();
    // Store current partstat before making changes
    previousPartstatRef.current = currentUserAttendee?.partstat;

    onLoadingChange(true);

    try {
      await handleRSVPClick(
        rsvpValue,
        contextualizedEvent,
        user,
        setAfterChoiceFunc,
        setOpenEditModePopup,
        dispatch
      );
    } catch (error) {
      const endTime = performance.now();
      console.error(
        `[RSVPButton ${rsvpValue}] Error in handleRSVPClick after ${(endTime - startTime).toFixed(2)}ms:`,
        error
      );
      // Clear loading on error
      onLoadingChange(false);
    }
  };

  return (
    <Button
      variant={
        currentUserAttendee?.partstat === rsvpValue ? "contained" : "outlined"
      }
      color={
        currentUserAttendee?.partstat === rsvpValue
          ? rsvpColor[rsvpValue]
          : "primary"
      }
      size="medium"
      sx={{ borderRadius: "50px", minWidth: showLoading ? "100px" : "auto" }}
      onClick={handleClick}
      disabled={isLoading}
    >
      {showLoading ? (
        <CircularProgress size={20} color="inherit" />
      ) : (
        t(`eventPreview.${rsvpValue}`)
      )}
    </Button>
  );
}
