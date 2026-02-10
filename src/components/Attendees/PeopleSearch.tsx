import { getAccessiblePair } from "@/components/Calendar/utils/calendarColorsUtils";
import { stringAvatar } from "@/components/Event/utils/eventUtils";
import { SnackbarAlert } from "@/components/Loading/SnackBarAlert";
import { searchUsers } from "@/features/User/userAPI";
import {
  Autocomplete,
  Avatar,
  Chip,
  CircularProgress,
  ListItem,
  ListItemAvatar,
  ListItemText,
  PaperProps,
  PopperProps,
  TextField,
  useTheme,
  type AutocompleteRenderInputParams,
} from "@linagora/twake-mui";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import {
  HTMLAttributes,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { useI18n } from "twake-i18n";

export interface User {
  email: string;
  displayName: string;
  avatarUrl?: string;
  openpaasId?: string;
  color?: Record<string, string>;
}

export interface ExtendedAutocompleteRenderInputParams extends AutocompleteRenderInputParams {
  error?: boolean;
  helperText?: string | null;
  placeholder?: string;
  label?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function PeopleSearch({
  selectedUsers,
  onChange,
  objectTypes,
  disabled,
  freeSolo,
  onToggleEventPreview,
  placeholder,
  inputSlot,
  customRenderInput,
  customSlotProps,
}: {
  selectedUsers: User[];
  onChange: (event: SyntheticEvent, users: User[]) => void;
  objectTypes: string[];
  disabled?: boolean;
  freeSolo?: boolean;
  onToggleEventPreview?: () => void;
  placeholder?: string;
  inputSlot?: (
    params: ExtendedAutocompleteRenderInputParams
  ) => React.ReactNode;
  customRenderInput?: (
    params: AutocompleteRenderInputParams,
    query: string,
    setQuery: (value: string) => void
  ) => ReactNode;
  customSlotProps?: {
    popper?: Partial<PopperProps>;
    paper?: Partial<PaperProps>;
    listbox?: Partial<HTMLAttributes<HTMLUListElement>>;
  };
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

  const searchPlaceholder = placeholder ?? t("peopleSearch.placeholder");

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
      } catch {
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

  const defaultRenderInput = useCallback(
    (params: AutocompleteRenderInputParams) => {
      const inputProps = {
        ...params.InputProps,
        startAdornment: (
          <>
            <PeopleOutlineOutlinedIcon
              fontSize="small"
              sx={{ mr: 1, color: "action.active" }}
            />
            {params.InputProps.startAdornment}
          </>
        ),
        endAdornment: (
          <>
            {loading ? <CircularProgress color="inherit" size={20} /> : null}
            {params.InputProps.endAdornment}
          </>
        ),
      };

      const enhancedParams = {
        ...params,
        InputProps: inputProps,
        inputProps: {
          ...params.inputProps,
          autoComplete: "off",
        },
      };

      const handleEnterKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && onToggleEventPreview) {
          e.preventDefault();
          onToggleEventPreview();
        }
      };

      const defaultTextFieldProps = {
        error: !!inputError,
        helperText: inputError,
        placeholder: searchPlaceholder,
        label: "",
        onKeyDown: handleEnterKey,
        slotProps: {
          input: {
            ...inputProps,
          },
        },
      };

      if (inputSlot) {
        return (
          <>
            <label htmlFor={params.id} className="visually-hidden">
              {t("peopleSearch.label")}
            </label>
            {inputSlot({
              ...enhancedParams,
              error: !!inputError,
              helperText: inputError,
              placeholder: searchPlaceholder,
              label: "",
              onKeyDown: handleEnterKey,
            })}
          </>
        );
      }

      return (
        <>
          <label htmlFor={params.id} className="visually-hidden">
            {t("peopleSearch.label")}
          </label>
          <TextField
            {...enhancedParams}
            {...defaultTextFieldProps}
            InputProps={inputProps}
            size="medium"
          />
        </>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputError, t, onToggleEventPreview, loading, searchPlaceholder]
  );

  return (
    <>
      <Autocomplete
        popupIcon={null}
        freeSolo={freeSolo}
        multiple
        options={options}
        autoComplete={false}
        clearOnBlur={false}
        blurOnSelect={true}
        open={
          customRenderInput
            ? isOpen && !!query && (loading || options.length > 0)
            : isOpen && !!query && (loading || hasSearched)
        }
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
        sx={{
          "& .MuiAutocomplete-inputRoot": {
            py: 0,
          },
        }}
        filterSelectedOptions
        value={selectedUsers}
        inputValue={query}
        onInputChange={(_event, value) => setQuery(value)}
        onChange={(event, value) => {
          const last = value[value.length - 1];
          if (typeof last === "string" && !isValidEmail(last.trim())) {
            const invalidEmailMessage = t("peopleSearch.invalidEmail").replace(
              "%{email}",
              last
            );
            setInputError(invalidEmailMessage);
            return;
          }
          setInputError(null);
          const mapped = value.map((v: string | User) =>
            typeof v === "string"
              ? { email: v.trim(), displayName: v.trim() }
              : v
          );
          onChange(event, mapped);
        }}
        slotProps={{
          ...customSlotProps,
          popper: {
            placement: "bottom-start",
            sx: { minWidth: "300px", ...customSlotProps?.popper?.sx },
            ...customSlotProps?.popper,
          },
        }}
        // When render input is custom, the adornments should be handled by the custom component
        forcePopupIcon={!customRenderInput}
        disableClearable={!!customRenderInput}
        renderInput={(params) =>
          customRenderInput
            ? customRenderInput(params, query, setQuery)
            : defaultRenderInput(params)
        }
        renderOption={(props, option) => {
          if (selectedUsers.find((u) => u.email === option.email)) return null;
          const { key, ...otherProps } = props;
          return (
            <ListItem key={key + option?.email} {...otherProps} disableGutters>
              <ListItemAvatar>
                <Avatar {...stringAvatar(option.displayName || option.email)} />
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
