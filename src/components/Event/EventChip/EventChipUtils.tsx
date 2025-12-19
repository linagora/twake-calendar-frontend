import CancelIcon from "@mui/icons-material/Cancel";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import { Box, getContrastRatio } from "twake-mui";
import moment from "moment";
import React, { useLayoutEffect, useState } from "react";
import { Calendars } from "../../../features/Calendars/CalendarTypes";
import { userAttendee } from "../../../features/User/userDataTypes";
import { EventErrorHandler } from "../../Error/EventErrorHandler";
import { EVENT_DURATION } from "./EventChip";

const COMPACT_WIDTH_THRESHOLD = 100;

export interface EventChipProps {
  arg: any;
  calendars: Record<string, Calendars>;
  tempcalendars: Record<string, Calendars>;
  errorHandler: EventErrorHandler;
}
export interface IconDisplayConfig {
  declined: boolean;
  tentative: boolean;
  needAction: boolean;
  private: boolean;
}
export function getEventDuration(event: any): number {
  return moment(event._instance.range.end).diff(
    moment(event._instance.range.start),
    "minutes"
  );
}
export function getBestColor(colors: { light: string; dark: string }): string {
  const contrastToDark = getContrastRatio(colors?.dark, "#fff");
  const contrastToLight = getContrastRatio(colors?.light, "#fff");
  return contrastToDark > contrastToLight ? colors?.dark : colors?.light;
}
export function getEventTimes(event: any, timeZone: string) {
  return {
    startTime: moment.tz(event.start, timeZone).format("HH:mm"),
    endTime: moment.tz(event.end, timeZone).format("HH:mm"),
  };
}
export function getOwnerAttendee(
  attendees: userAttendee[],
  ownerEmails: Set<string>
): userAttendee | undefined {
  return attendees.find((att) =>
    ownerEmails.has(att.cal_address.toLowerCase())
  );
}

export function getTitleStyle(
  bestColor: string,
  partstat?: string,
  calendar?: any
): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    fontFamily: "Roboto",
    fontWeight: "500",
    fontStyle: "Medium",
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0.5px",
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
    font: "Roboto",
    whiteSpace: "nowrap",
    color: bestColor,
  };

  switch (partstat) {
    case "DECLINED":
      return { ...baseStyle, textDecoration: "line-through" };
    case "TENTATIVE":
    case "ACCEPTED":
      return { ...baseStyle, color: calendar?.color?.dark };
    case "NEEDS-ACTION":
      return baseStyle;
    default:
      return baseStyle;
  }
}

function getEventVariant(duration: number) {
  if (duration <= EVENT_DURATION.SHORT) return "short";
  if (duration <= EVENT_DURATION.MEDIUM) return "medium";
  if (duration <= EVENT_DURATION.LONG) return "long";
  return "extraLong";
}

function getCardVariantStyle(
  variant: string,
  baseColor: string
): React.CSSProperties {
  const shared: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: "8px",
    boxShadow: "none",
    border: `1px solid ${baseColor}`,
    color: baseColor,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  };

  switch (variant) {
    case "short":
      return { ...shared, padding: "0px 6px", justifyContent: "center" };
    case "medium":
      return { ...shared, padding: "4px 6px", justifyContent: "center" };
    default:
      return {
        ...shared,
        padding: "4px 6px",
      };
  }
}

export function getCardStyle(
  bestColor: string,
  eventLength: number,
  partstat?: string,
  calendar?: any
): React.CSSProperties {
  const baseStyle: React.CSSProperties = getCardVariantStyle(
    getEventVariant(eventLength),
    bestColor
  );

  switch (partstat) {
    case "DECLINED":
      return baseStyle;
    case "TENTATIVE":
      return {
        ...baseStyle,
        backgroundColor: calendar?.color?.light,
        color: calendar?.color?.dark,
        border: "1px solid white",
      };
    case "NEEDS-ACTION":
      return {
        ...baseStyle,
        backgroundColor: "#fff",
      };
    case "ACCEPTED":
      return {
        ...baseStyle,
        backgroundColor: calendar?.color?.light,
        color: calendar?.color?.dark,
        border: "1px solid white",
      };
    default:
      return baseStyle;
  }
}

export function DisplayedIcons(IconDisplayed: IconDisplayConfig) {
  if (!Object.values(IconDisplayed).find((b) => b === true)) return;
  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "1px",
        marginRight: "4px",
      }}
    >
      {IconDisplayed.needAction && (
        <HelpOutlineIcon style={{ fontSize: "15px" }} />
      )}
      {IconDisplayed.declined && <CancelIcon style={{ fontSize: "15px" }} />}
      {IconDisplayed.tentative && (
        <HelpOutlineIcon style={{ fontSize: "15px" }} />
      )}
      {IconDisplayed.private && (
        <LockOutlineIcon style={{ fontSize: "15px" }} />
      )}
    </Box>
  );
}

export function useCompactMode(
  cardRef: React.RefObject<HTMLDivElement | null>
): boolean {
  const [showCompact, setShowCompact] = useState(false);

  useLayoutEffect(() => {
    if (!cardRef.current) return;

    const checkWidth = () => {
      const width = cardRef.current?.offsetWidth ?? 0;
      const newCompact = width < COMPACT_WIDTH_THRESHOLD;

      setShowCompact((prev) => (prev !== newCompact ? newCompact : prev));
    };

    checkWidth();

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(checkWidth);
    });

    resizeObserver.observe(cardRef.current);

    return () => resizeObserver.disconnect();
  }, [cardRef]);

  return showCompact;
}
