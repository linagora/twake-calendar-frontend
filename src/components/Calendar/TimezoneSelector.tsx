import { TextField, Box, Autocomplete, ListItem } from "@mui/material";
import { useMemo } from "react";
import { TIMEZONES } from "../../utils/timezone-data";

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimezoneSelector({ value, onChange }: TimezoneSelectProps) {
  const resolveTimezone = (tzName: string): string => {
    if (TIMEZONES.zones[tzName]) {
      return tzName;
    }
    if (TIMEZONES.aliases[tzName]) {
      return TIMEZONES.aliases[tzName].aliasTo;
    }
    return tzName;
  };
  const timezoneList = useMemo(() => {
    const zones = Object.keys(TIMEZONES.zones).sort();
    const browserTz = resolveTimezone(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    const getTimezoneOffset = (tzName: string): string => {
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
    };

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

  return (
    <Autocomplete
      value={selectedOption}
      onChange={(event, newValue) => {
        if (newValue) {
          onChange(newValue.value);
        }
      }}
      options={options}
      getOptionLabel={(option) => `${option.offset} ${option.label}`}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
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
      renderOption={(props, option) => (
        <ListItem {...props} key={option.value}>
          ({option.offset}) {option.label}
        </ListItem>
      )}
      isOptionEqualToValue={(option, value) => option.value === value.value}
      disableClearable
      onClick={(e) => e.stopPropagation()}
      slotProps={{
        paper: {
          style: {
            maxHeight: 300,
            width: 250,
          },
        },
      }}
      renderValue={(value) => <div>{value.offset}</div>}
    />
  );
}
