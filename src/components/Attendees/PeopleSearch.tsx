import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import { searchUsers } from "../../features/User/userAPI";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";
import { getAccessiblePair } from "../Calendar/utils/calendarColorsUtils";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
import { SnackbarAlert } from "../Loading/SnackBarAlert";

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
  const [hasSearched, setHasSearched] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const [inputError, setInputError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const theme = useTheme();

  useEffect(() => {
    let cancelled = false;

    const delayDebounceFn = setTimeout(async () => {
      if (!query.trim()) {
        if (!cancelled) {
          setOptions([]);
          setLoading(false);
          setHasSearched(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setHasSearched(false);
      }

      try {
        const res = await searchUsers(query, objectTypes);
        if (!cancelled) {
          setOptions(res);
          setHasSearched(true);
        }
      } catch (error: any) {
        if (!cancelled) {
          setHasSearched(false);
          setSnackbarMessage(t("peopleSearch.searchError"));
          setSnackbarOpen(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(delayDebounceFn);
    };
  }, [objectTypes, query, t]);

  return (
    <>
      <Autocomplete
        freeSolo={freeSolo}
        multiple
        options={options}
        autoComplete={false}
        clearOnBlur={false}
        blurOnSelect={true}
        open={isOpen && !!query && (loading || hasSearched)}
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
        disabled={disabled}
        loading={loading}
        filterOptions={(x) => x}
        fullWidth
        noOptionsText={t("peopleSearch.noResults")}
        loadingText={t("peopleSearch.loading")}
        getOptionLabel={(option) => {
          if (typeof option === "object") {
            return option.displayName || option.email;
          } else {
            return option;
          }
        }}
        filterSelectedOptions
        value={selectedUsers}
        inputValue={query}
        onInputChange={(event, value) => setQuery(value)}
        onChange={(event, value) => {
          const last = value[value.length - 1];
          if (typeof last === "string" && !isValidEmail(last)) {
            const invalidEmailMessage = t("peopleSearch.invalidEmail").replace(
              "%{email}",
              last
            );
            setInputError(invalidEmailMessage);
            return;
          }
          setInputError(null);
          const mapped = value.map((v: any) =>
            typeof v === "string" ? { email: v } : v
          );
          onChange(event, mapped);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            error={!!inputError}
            helperText={inputError}
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
                autoComplete: "off",
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
              autoComplete: "off",
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
            const label = isString
              ? option
              : option.displayName || option.email;
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
      <SnackbarAlert
        open={snackbarOpen}
        setOpen={(open: boolean) => {
          setSnackbarOpen(open);
          if (!open) {
            setSnackbarMessage("");
          }
        }}
        message={snackbarMessage}
        severity="error"
      />
    </>
  );
}
