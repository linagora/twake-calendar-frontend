import { Button, Popover } from "@mui/material";
import { MouseEvent, useMemo, useState } from "react";
import { TIMEZONES } from "../../utils/timezone-data";
import { TimezoneAutocomplete } from "../Timezone/TimezoneAutocomplete";

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimezoneSelector({ value, onChange }: TimezoneSelectProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const timezoneList = useMemo(() => {
    const zones = Object.keys(TIMEZONES.zones).sort();
    const browserTz = resolveTimezone(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    return { zones, browserTz, getTimezoneOffset };
  }, []);

  const effectiveTimezone = value
    ? resolveTimezone(value)
    : timezoneList.browserTz;
  const selectedOffset = getTimezoneOffset(effectiveTimezone);

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Button
        variant="text"
        size="small"
        onClick={handleOpen}
        sx={{
          textTransform: "none",
          minWidth: "auto",
          padding: "2px 4px",
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {selectedOffset || "Select Timezone"}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: { width: 280, maxHeight: 400, overflow: "auto", p: 1 },
          },
        }}
      >
        <TimezoneAutocomplete
          value={effectiveTimezone}
          onChange={onChange}
          zones={timezoneList.zones}
          getTimezoneOffset={getTimezoneOffset}
          autoFocus={true}
          inputFontSize="10px"
          inputPadding="2px 4px"
          onClose={handleClose}
          disableClearable={true}
        />
      </Popover>
    </>
  );
}

export function resolveTimezone(tzName: string): string {
  if (TIMEZONES.zones[tzName]) {
    return tzName;
  }
  if (TIMEZONES.aliases[tzName]) {
    return TIMEZONES.aliases[tzName].aliasTo;
  }
  return tzName;
}

export function getTimezoneOffset(tzName: string): string {
  const resolvedTz = resolveTimezone(tzName);
  const tzData = TIMEZONES.zones[resolvedTz];
  if (!tzData) return "";

  const icsMatch = tzData.ics.match(/TZOFFSETTO:([+-]\d{4})/);
  if (!icsMatch) return "";

  const offset = icsMatch[1];
  const hours = parseInt(offset.slice(0, 3));
  const minutes = parseInt(offset.slice(3));

  if (minutes === 0) {
    return `UTC${hours >= 0 ? "+" : ""}${hours}`;
  }
  return `UTC${hours >= 0 ? "+" : ""}${hours}:${Math.abs(minutes).toString().padStart(2, "0")}`;
}
