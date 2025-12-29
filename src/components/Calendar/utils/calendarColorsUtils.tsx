import { darken, getContrastRatio, lighten, Theme } from "twake-mui";
import { ThunkDispatch } from "@reduxjs/toolkit";
import { updateCalColor } from "../../../features/Calendars/CalendarSlice";
import { Calendars } from "../../../features/Calendars/CalendarTypes";

export function updateDarkColor(
  calendars: Record<string, Calendars>,
  theme: Theme,
  dispatch: ThunkDispatch<any, any, any>
) {
  Object.values(calendars).forEach((cal) => {
    if (!cal?.color?.light || typeof cal.color.light !== "string") return;
    const baseColor = cal.color.light;

    const isDefault = Object.values(defaultColors).find(
      (c) => c.light === baseColor
    );
    const darkColor = isDefault
      ? isDefault.dark
      : getAccessiblePair(baseColor, theme);

    if (cal.color?.dark === darkColor) {
      return;
    }

    dispatch(
      updateCalColor({
        id: cal.id,
        color: { light: baseColor, dark: darkColor },
      })
    );
  });
}

export function getAccessiblePair(baseColor: string, theme: Theme): string {
  if (typeof baseColor !== "string") {
    return theme.palette.getContrastText("#000");
  }

  const contrastToBlack = getContrastRatio(baseColor, "#000");
  const contrastToWhite = getContrastRatio(baseColor, "#fff");
  const isLight = contrastToBlack > contrastToWhite;

  const adjusted = isLight ? darken(baseColor, 0.6) : lighten(baseColor, 0.7);

  // Check if contrast meets 4.5
  const contrast = getContrastRatio(baseColor, adjusted);
  if (contrast >= 4.5) return adjusted;

  if (isLight) {
    return "#ffffffff";
  }

  return theme.palette.getContrastText(baseColor);
}

export const defaultColors = [
  { light: "#D0ECDA", dark: "#329655" },
  { light: "#FAE3CE", dark: "#E15300" },
  { light: "#F5CFD0", dark: "#BE0103" },
  { light: "#AFCBEF", dark: "#0654B1" },
];
