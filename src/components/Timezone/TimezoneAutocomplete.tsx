import { Autocomplete, TextField } from "@mui/material";
import { PublicOutlined as TimezoneIcon } from "@mui/icons-material";
import { useMemo } from "react";

interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

interface TimezoneAutocompleteProps {
  value: string;
  onChange: (timezone: string) => void;
  zones: string[];
  getTimezoneOffset: (tzName: string) => string;
  showIcon?: boolean;
  autoFocus?: boolean;
  width?: number | string;
  size?: "small" | "medium";
  placeholder?: string;
  inputFontSize?: string;
  inputPadding?: string;
  onClose?: () => void;
  disableClearable?: boolean;
}

export function TimezoneAutocomplete({
  value,
  onChange,
  zones,
  getTimezoneOffset,
  showIcon = false,
  autoFocus = false,
  width,
  size = "small",
  placeholder = "Select timezone",
  inputFontSize,
  inputPadding,
  onClose,
  disableClearable = false,
}: TimezoneAutocompleteProps) {
  const options = useMemo<TimezoneOption[]>(() => {
    return zones.map((tz) => ({
      value: tz,
      label: tz.replace(/_/g, " "),
      offset: getTimezoneOffset(tz),
    }));
  }, [zones, getTimezoneOffset]);

  const selectedOption = options.find((opt) => opt.value === value) || null;

  return (
    <Autocomplete
      autoFocus={autoFocus}
      value={selectedOption}
      onChange={(event, newValue) => {
        if (newValue) {
          onChange(newValue.value);
          onClose?.();
        }
      }}
      options={options}
      getOptionLabel={(option) => `(${option.offset}) ${option.label}`}
      size={size}
      sx={width ? { width } : undefined}
      disableClearable={disableClearable}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          variant="outlined"
          autoComplete="off"
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: showIcon ? (
                <>
                  <TimezoneIcon
                    style={{
                      marginRight: 8,
                      color: "rgba(0, 0, 0, 0.54)",
                    }}
                  />
                  {params.InputProps.startAdornment}
                </>
              ) : (
                params.InputProps.startAdornment
              ),
              ...(inputFontSize || inputPadding
                ? {
                    style: {
                      ...(inputFontSize ? { fontSize: inputFontSize } : {}),
                      ...(inputPadding ? { padding: inputPadding } : {}),
                    },
                  }
                : {}),
            },
          }}
          inputProps={{
            ...params.inputProps,
            autoComplete: "new-password",
          }}
        />
      )}
    />
  );
}
