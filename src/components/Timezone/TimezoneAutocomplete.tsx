import { Autocomplete, TextField } from "@linagora/twake-mui";
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
  inputRef?: React.Ref<HTMLInputElement>;
  width?: number | string;
  size?: "small" | "medium";
  placeholder?: string;
  inputFontSize?: string;
  inputPadding?: string;
  onClose?: () => void;
  disableClearable?: boolean;
  hideBorder?: boolean;
  openOnFocus?: boolean;
}

export function TimezoneAutocomplete({
  value,
  onChange,
  zones,
  getTimezoneOffset,
  showIcon = false,
  inputRef,
  width,
  size = "small",
  placeholder = "Select timezone",
  inputFontSize,
  inputPadding,
  onClose,
  disableClearable = false,
  hideBorder = false,
  openOnFocus = false,
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
      openOnFocus={openOnFocus}
      value={selectedOption}
      onChange={(event, newValue) => {
        if (newValue) {
          onChange(newValue.value);
          onClose?.();
        }
      }}
      options={options}
      getOptionLabel={(option) => `${option.label} (${option.offset})`}
      size={size}
      sx={width ? { width } : undefined}
      disableClearable={disableClearable}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          onFocus={(e) => e.target.select()}
          variant="outlined"
          autoComplete="off"
          inputRef={inputRef}
          sx={
            hideBorder
              ? {
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                }
              : undefined
          }
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
