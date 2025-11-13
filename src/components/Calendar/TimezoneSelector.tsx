import { Button, Popover } from "@mui/material";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
import moment from "moment";
import { MouseEvent, useMemo, useState } from "react";
import { TIMEZONES } from "../../utils/timezone-data";
import { TimezoneAutocomplete } from "../Timezone/TimezoneAutocomplete";

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  referenceDate: Date;
}

export function TimezoneSelector({
  value,
  onChange,
  referenceDate,
}: TimezoneSelectProps) {
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
  const selectedOffset = getTimezoneOffset(effectiveTimezone, referenceDate);

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const { t } = useI18n();
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
        {selectedOffset || t("common.select_timezone")}
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
            sx: { width: 280, maxHeight: 400, overflow: "hidden", p: 0 },
          },
        }}
      >
        <TimezoneAutocomplete
          size="medium"
          value={effectiveTimezone}
          onChange={onChange}
          zones={timezoneList.zones}
          getTimezoneOffset={(tzName: string) =>
            getTimezoneOffset(tzName, referenceDate)
          }
          autoFocus={true}
          showIcon={true}
          inputFontSize="14px"
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

export function getTimezoneOffset(
  tzName: string,
  date: Date = new Date()
): string {
  const fmt = new Intl.DateTimeFormat(undefined, {
    timeZone: tzName,
    timeZoneName: "shortOffset",
  });

  const currentDate = moment(date).isValid() ? date : new Date();
  const parts = fmt.formatToParts(currentDate);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  return offsetPart?.value.replace("GMT", "UTC") ?? "";
}
