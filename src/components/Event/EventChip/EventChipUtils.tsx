import CancelIcon from "@mui/icons-material/Cancel";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import RepeatIcon from "@mui/icons-material/Repeat";
import { Box, getContrastRatio } from "@mui/material";
import moment from "moment";
import React from "react";
import { Calendars } from "../../../features/Calendars/CalendarTypes";
import { userAttendee } from "../../../features/User/userDataTypes";
import { EventErrorHandler } from "../../Error/EventErrorHandler";

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
  recurrent: boolean;
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

export function getCardStyle(
  bestColor: string,
  partstat?: string,
  calendar?: any
): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: "6px",
    boxShadow: "none",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    border: `1px solid ${bestColor}`,
    color: bestColor,
  };

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

export function DisplayedIcons(
  IconDisplayed: IconDisplayConfig,
  isCompact?: boolean
) {
  if (isCompact) {
    return (
      <Box
        style={{
          display: "flex",
          flexDirection: "row",
        }}
      >
        {IconDisplayed.recurrent && <RepeatIcon style={{ fontSize: "16px" }} />}
        {IconDisplayed.private && (
          <LockOutlineIcon style={{ fontSize: "16px" }} />
        )}
        {IconDisplayed.tentative && (
          <HelpOutlineIcon style={{ fontSize: "16px" }} />
        )}
        {IconDisplayed.declined && (
          <CancelIcon color="error" style={{ fontSize: "16px" }} />
        )}
        {IconDisplayed.needAction && (
          <HelpOutlineIcon style={{ fontSize: "16px" }} />
        )}
      </Box>
    );
  }

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "1px",
        fontSize: "5%",
      }}
    >
      {IconDisplayed.needAction && (
        <HelpOutlineIcon style={{ fontSize: "15px" }} />
      )}
      {IconDisplayed.declined && (
        <CancelIcon color="error" style={{ fontSize: "15px" }} />
      )}
      {IconDisplayed.tentative && (
        <HelpOutlineIcon style={{ fontSize: "15px" }} />
      )}
      {IconDisplayed.private && (
        <LockOutlineIcon style={{ fontSize: "15px" }} />
      )}
      {IconDisplayed.recurrent && <RepeatIcon style={{ fontSize: "15px" }} />}
    </Box>
  );
}
