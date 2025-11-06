import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import { useState, useEffect } from "react";
import { searchUsers } from "../../features/User/userAPI";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";
import { getAccessiblePair } from "../Calendar/utils/calendarColorsUtils";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";

export interface User {
  email: string;
  displayName: string;
  avatarUrl: string;
  openpaasId: string;
  color?: Record<string, string>;
}

export function PeopleSearch({
  selectedUsers,
  onChange,
  objectTypes,
  disabled,
  freeSolo,
  onToggleEventPreview,
}: {
  selectedUsers: User[];
  onChange: Function;
  objectTypes: string[];
  disabled?: boolean;
  freeSolo?: boolean;
  onToggleEventPreview?: Function;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<User[]>([]);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query) {
        setLoading(true);
        const res = await searchUsers(query, objectTypes);
        setOptions(res);
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, objectTypes]);

  return (
    <Autocomplete
      freeSolo={freeSolo}
      multiple
      options={options}
      open={!!query}
      disabled={disabled}
      loading={loading}
      filterOptions={(x) => x}
      fullWidth
      getOptionLabel={(option) => {
        if (typeof option === "object") {
          return option.displayName || option.email;
        } else {
          return option;
        }
      }}
      filterSelectedOptions
      value={selectedUsers}
      onInputChange={(event, value) => setQuery(value)}
      onChange={(event, value) => {
        const last = value[value.length - 1];
        if (typeof last === "string" && !isValidEmail(last)) {
          setError(t("peopleSearch.invalidEmail", { email: last }));
          return;
        }
        setError(null);
        const mapped = value.map((v: any) =>
          typeof v === "string" ? { email: v } : v
        );
        onChange(event, mapped);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          error={!!error}
          helperText={error}
          placeholder={t("peopleSearch.placeholder")}
          label={t("peopleSearch.label")}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter" && onToggleEventPreview) {
              e.preventDefault();
              onToggleEventPreview();
            }
          }}
          slotProps={{
            input: {
              ...params.InputProps,
              autoComplete: "new-password",
              startAdornment: (
                <>
                  <PeopleOutlineOutlinedIcon
                    style={{ marginRight: 8, color: "rgba(0, 0, 0, 0.54)" }}
                  />
                  {params.InputProps.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
          inputProps={{
            ...params.inputProps,
            autoComplete: "new-password",
          }}
        />
      )}
      renderOption={(props, option) => {
        if (selectedUsers.find((u) => u.email === option.email)) return null;
        const { key, ...otherProps } = props as any;
        return (
          <ListItem key={key + option?.email} {...otherProps} disableGutters>
            <ListItemAvatar>
              <Avatar src={option.avatarUrl} alt={option.displayName} />
            </ListItemAvatar>
            <ListItemText
              primary={option.displayName}
              secondary={option.email}
            />
          </ListItem>
        );
      }}
      renderValue={(value, getTagProps) =>
        value.map((option, index) => {
          const isString = typeof option === "string";
          const label = isString ? option : option.displayName || option.email;
          const chipColor = isString
            ? theme.palette.grey[300]
            : (option.color?.light ?? theme.palette.grey[300]);
          const textColor = getAccessiblePair(chipColor, theme);

          return (
            <Chip
              {...getTagProps({ index })}
              key={label}
              style={{
                backgroundColor: chipColor,
                color: textColor,
              }}
              label={label}
            />
          );
        })
      }
    />
  );
}
