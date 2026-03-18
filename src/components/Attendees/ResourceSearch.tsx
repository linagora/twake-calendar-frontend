import { getAccessiblePair } from "@/utils/getAccessiblePair";
import { useUserSearch } from "./useUserSearch";
import { ResourceIcon } from "./ResourceIcon";
import { SnackbarAlert } from "@/components/Loading/SnackBarAlert";
import {
  Autocomplete,
  Chip,
  CircularProgress,
  ListItem,
  ListItemAvatar,
  ListItemText,
  PaperProps,
  PopperProps,
  TextField,
  useTheme,
  Typography,
  type AutocompleteRenderInputParams,
} from "@linagora/twake-mui";
import SearchIcon from "@mui/icons-material/Search";
import {
  HTMLAttributes,
  useCallback,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { useI18n } from "twake-i18n";

export interface Resource {
  email?: string;
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

export function ResourceSearch({
  selectedResources,
  onChange,
  objectTypes,
  disabled,
  freeSolo,
  onToggleEventPreview,
  placeholder,
  inputSlot,
  customRenderInput,
  customSlotProps,
  hideLabel,
}: {
  selectedResources: Resource[];
  onChange: (event: SyntheticEvent, users: Resource[]) => void;
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
  hideLabel?: boolean;
}) {
  const { t } = useI18n();
  const searchPlaceholder = placeholder ?? t("resourceSearch.placeholder");
  const errorMessage = t("resourceSearch.searchError");

  const {
    query,
    setQuery,
    loading,
    options,
    hasSearched,
    isOpen,
    setIsOpen,
    inputError,
    setInputError,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    setSnackbarMessage,
  } = useUserSearch<Resource>({ objectTypes, errorMessage });

  const theme = useTheme();

  const handleBlurCommit = useCallback(
    (event: React.SyntheticEvent) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      if (selectedResources.find((u) => u.displayName === trimmed)) {
        setQuery("");
        return;
      }
      setInputError(null);
      const newResource: Resource = { displayName: trimmed };
      onChange(event, [...selectedResources, newResource]);
      setQuery("");
    },
    [query, selectedResources, onChange, setInputError, setQuery]
  );

  const defaultRenderInput = useCallback(
    (params: AutocompleteRenderInputParams) => {
      const inputProps = {
        ...params.InputProps,
        startAdornment: (
          <>
            {!selectedResources?.length ? (
              <SearchIcon
                fontSize="small"
                sx={{ mr: 1, color: "action.active" }}
              />
            ) : null}
            {params.InputProps.startAdornment}
          </>
        ),
        endAdornment: (
          <>
            {loading ? <CircularProgress color="inherit" size={20} /> : null}
            {!selectedResources?.length ? params.InputProps.endAdornment : null}
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
            {!hideLabel && (
              <Typography variant="h6" sx={{ marginBottom: "10px" }}>
                {t("resourceSearch.label")}
              </Typography>
            )}
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
          {!hideLabel && (
            <Typography variant="h6" sx={{ marginBottom: "10px" }}>
              {t("resourceSearch.label")}
            </Typography>
          )}
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
    [
      inputError,
      t,
      onToggleEventPreview,
      loading,
      searchPlaceholder,
      selectedResources?.length,
    ]
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
        onBlur={freeSolo ? handleBlurCommit : undefined}
        open={
          customRenderInput
            ? isOpen && !!query && (loading || options.length > 0)
            : isOpen && !!query && (loading || hasSearched)
        }
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
        disabled={disabled}
        loading={loading}
        filterOptions={(options: Resource[]) => options}
        fullWidth
        noOptionsText={t("resourceSearch.noResults")}
        loadingText={t("resourceSearch.loading")}
        getOptionLabel={(option: Resource | string) => {
          if (typeof option === "object") {
            return option.displayName;
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
        value={selectedResources}
        inputValue={query}
        onInputChange={(_event, value: string) => setQuery(value)}
        onChange={(event, value: string[] | Resource[]) => {
          setInputError(null);
          const mapped = value
            .map((v: string | Resource) =>
              typeof v === "string" ? { displayName: v.trim() } : v
            )
            .filter((v) => v.displayName.trim().length > 0);
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
        renderOption={(props, option: Resource) => {
          if (
            selectedResources.find((u) => u.displayName === option.displayName)
          )
            return null;
          const { key, ...otherProps } = props;
          return (
            <ListItem
              key={key + option?.displayName}
              {...otherProps}
              disableGutters
            >
              <ListItemAvatar>
                <ResourceIcon avatarUrl={option.avatarUrl} />
              </ListItemAvatar>
              <ListItemText primary={option.displayName} />
            </ListItem>
          );
        }}
        renderValue={(value: string[] | Resource[], getTagProps) =>
          value.map((option: string | Resource, index) => {
            const isString = typeof option === "string";
            const label = isString ? option : option.displayName;
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
