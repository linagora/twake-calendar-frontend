import {
  Autocomplete,
  Button,
  ListItem,
  Popover,
  TextField,
} from "@mui/material";
import { MouseEvent, useMemo, useState } from "react";
import { TIMEZONES } from "../../utils/timezone-data";

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
  const options = useMemo(() => {
    return timezoneList.zones.map((tz) => ({
      value: tz,
      label: tz.replace(/_/g, " "),
      offset: timezoneList.getTimezoneOffset(tz),
    }));
  }, [timezoneList]);

  const selectedOption =
    options.find((opt) => opt.value === value) || options[0];

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
        {selectedOption ? selectedOption.offset : "Select Timezone"}
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
        <TimeZoneSearch
          selectedOption={selectedOption}
          onChange={onChange}
          handleClose={handleClose}
          options={options}
        />
      </Popover>
    </>
  );
}
function TimeZoneSearch({
  selectedOption,
  onChange,
  handleClose,
  options,
}: {
  selectedOption: { value: string; label: string; offset: string };
  onChange: (value: string) => void;
  handleClose: () => void;
  options: { value: string; label: string; offset: string }[];
}) {
  return (
    <Autocomplete
      autoFocus
      value={selectedOption}
      onChange={(event, newValue) => {
        if (newValue) {
          onChange(newValue.value);
          handleClose(); // close after selection
        }
      }}
      options={options}
      getOptionLabel={(option) => `${option.offset} ${option.label}`}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          size="small"
          InputProps={{
            ...params.InputProps,
            style: {
              fontSize: "10px",
              padding: "2px 4px",
            },
          }}
        />
      )}
      disableClearable
      renderValue={(value) => <div>{value.offset}</div>}
    />
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
