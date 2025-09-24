import CloseIcon from "@mui/icons-material/Close";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, useEffect } from "react";
import { searchUsers } from "../../features/User/userAPI";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";

export interface User {
  email: string;
  displayName: string;
  avatarUrl: string;
  openpaasId: string;
  color?: string;
}

export function PeopleSearch({
  selectedUsers,
  onChange,
  disabled,
  freeSolo,
  onToggleEventPreview,
}: {
  selectedUsers: User[];
  onChange: Function;
  disabled?: boolean;
  freeSolo?: boolean;
  onToggleEventPreview?: Function;
}) {
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
        const res = await searchUsers(query, ["user"]);
        setOptions(res);
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <Autocomplete
      freeSolo={freeSolo}
      multiple
      options={options}
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
          setError(`"${last}" is not a valid email address`);
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
          placeholder="Search user"
          label="Search user"
          onKeyDown={(e) => {
            if (e.key === "Enter" && onToggleEventPreview) {
              e.preventDefault();
              onToggleEventPreview();
            }
          }}
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <>
                  <PeopleOutlineOutlinedIcon
                    sx={{ mr: 1, color: "action.active" }}
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
        />
      )}
      renderOption={(props, option) => {
        if (selectedUsers.find((u) => u.email === option.email)) return;
        return (
          <ListItem
            {...props}
            key={option.email + option.displayName}
            disableGutters
          >
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
            : (option.color ?? theme.palette.grey[300]);
          const textColor = theme.palette.getContrastText(chipColor);

          return (
            <Chip
              {...getTagProps({ index })}
              key={label}
              sx={{
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
