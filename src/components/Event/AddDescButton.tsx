import { Box, Button, TextField } from "@linagora/twake-mui";
import { Description as DescriptionIcon } from "@mui/icons-material";
import { useI18n } from "twake-i18n";
import { FieldWithLabel } from "./components/FieldWithLabel";

export function AddDescButton({
  showDescription,
  setShowDescription,
  showMore,
  description,
  setDescription,
  buttonVariant,
  buttonColor,
}: {
  showDescription: boolean;
  setShowDescription: (b: boolean) => void;
  showMore: boolean;
  description: string;
  setDescription: (d: string) => void;
  buttonVariant?: "text" | "outlined" | "contained";
  buttonColor?:
    | "inherit"
    | "primary"
    | "secondary"
    | "success"
    | "error"
    | "info"
    | "warning";
}) {
  const { t } = useI18n();
  return (
    <>
      {!showDescription && (
        <FieldWithLabel label=" " isExpanded={showMore}>
          <Box display="flex" gap={1}>
            <Button
              startIcon={<DescriptionIcon />}
              onClick={() => setShowDescription(true)}
              size="medium"
              variant={buttonVariant}
              color={buttonColor}
            >
              {t("event.form.addDescription")}
            </Button>
          </Box>
        </FieldWithLabel>
      )}
      {showDescription && (
        <FieldWithLabel
          label={t("event.form.description")}
          isExpanded={showMore}
          sx={{ padding: 0, margin: 0 }}
        >
          <TextField
            fullWidth
            label=""
            inputProps={{ "aria-label": t("event.form.description") }}
            placeholder={t("event.form.descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size="small"
            margin="dense"
            multiline
            minRows={2}
            maxRows={10}
            sx={{
              "& .MuiInputBase-root": {
                maxHeight: "33%",
                overflowY: "auto",
                padding: 0,
              },
              "& textarea": {
                resize: "vertical",
              },
            }}
          />
        </FieldWithLabel>
      )}
    </>
  );
}
