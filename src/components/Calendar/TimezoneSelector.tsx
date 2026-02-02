import {
  browserDefaultTimeZone,
  getTimezoneOffset,
  resolveTimezone,
} from "@/utils/timezone";
import { TIMEZONES } from "@/utils/timezone-data";
import { Button, Popover } from "@linagora/twake-mui";
import { MouseEvent, useMemo, useState } from "react";
import { useI18n } from "twake-i18n";
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

  const timezoneList = useTimeZoneList();

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
          showIcon={false}
          inputFontSize="14px"
          inputPadding="2px 4px"
          onClose={handleClose}
          disableClearable={true}
        />
      </Popover>
    </>
  );
}

export function useTimeZoneList() {
  return useMemo(() => {
    const zones = Object.keys(TIMEZONES.zones).sort();
    const browserTz = resolveTimezone(browserDefaultTimeZone);

    return { zones, browserTz, getTimezoneOffset };
  }, []);
}
