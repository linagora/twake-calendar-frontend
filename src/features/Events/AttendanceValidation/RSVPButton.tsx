import { useAppDispatch } from "@/app/hooks";
import { PartStat } from "@/features/User/models/attendee";
import { userData } from "@/features/User/userDataTypes";
import { Box, Button, CircularProgress, Theme } from "@linagora/twake-mui";
import { Dispatch, SetStateAction, useEffect, useRef } from "react";
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
  setAfterChoiceFunc: (
    func: ((type: "solo" | "all" | undefined) => void) | undefined
  ) => void;
  setOpenEditModePopup: Dispatch<SetStateAction<string | null>>;
  isLoading: boolean;
  onLoadingChange: (loading: boolean, value?: PartStat) => void;
  loadingValue: PartStat | null;
}

export function RSVPButton({
  rsvpValue,
  contextualizedEvent,
  user,
  setAfterChoiceFunc,
  setOpenEditModePopup,
  isLoading,
  onLoadingChange,
  loadingValue,
}: RSVPButtonProps) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const { currentUserAttendee } = contextualizedEvent;
  const showLoading = isLoading && loadingValue === rsvpValue;
  const previousPartstatRef = useRef<PartStat | undefined>(
    currentUserAttendee?.partstat
  );

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
    // Store current partstat before making changes
    previousPartstatRef.current = currentUserAttendee?.partstat;
    if (previousPartstatRef.current === rsvpValue) {
      return;
    }

    // For recurring events, don't set loading yet - wait for modal choice
    if (!contextualizedEvent.isRecurring) {
      onLoadingChange(true, rsvpValue);
    }

    try {
      await handleRSVPClick(
        rsvpValue,
        contextualizedEvent,
        user,
        setAfterChoiceFunc,
        setOpenEditModePopup,
        dispatch,
        onLoadingChange
      );
    } catch (error) {
      console.error(
        `[RSVPButton ${rsvpValue}] Error in handleRSVPClick:`,
        error
      );
      // Clear loading on error
      onLoadingChange(false);
    }
  };

  const isCurrentlyActive = currentUserAttendee?.partstat === rsvpValue;

  // Show as active (colored) if:
  // 1. This button is currently loading, OR
  // 2. This is the active status AND nothing is loading
  const shouldShowActive = showLoading || (isCurrentlyActive && !isLoading);

  const buttonColor = shouldShowActive ? rsvpColor[rsvpValue] : "primary";

  return (
    <Button
      variant={shouldShowActive ? "contained" : "outlined"}
      color={buttonColor}
      size="medium"
      sx={{
        borderRadius: "50px",
        // Override MUI's default disabled styles to keep the color
        "&.Mui-disabled": shouldShowActive
          ? {
              backgroundColor: (theme: Theme) =>
                theme.palette[buttonColor].main,
              color: (theme: Theme) => theme.palette[buttonColor].contrastText,
              borderColor: (theme: Theme) => theme.palette[buttonColor].main,
            }
          : {},
      }}
      onClick={handleClick}
      disabled={isLoading}
    >
      <Box display="flex" alignItems="center" gap={1}>
        {showLoading && <CircularProgress size={20} color="inherit" />}
        {t(`eventPreview.${rsvpValue}`)}
      </Box>
    </Button>
  );
}
