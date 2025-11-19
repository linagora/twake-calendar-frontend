import { Box, Button, TextField } from "@mui/material";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
import { FieldWithLabel } from "./components/FieldWithLabel";
import { Description as DescriptionIcon } from "@mui/icons-material";

export function AddDescButton({
  showDescription,
  setShowDescription,
  showMore,
  description,
  setDescription,
}: {
  showDescription: boolean;
  setShowDescription: (b: boolean) => void;
  showMore: boolean;
  description: string;
  setDescription: (d: string) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      {!showDescription && (
        <FieldWithLabel label=" " isExpanded={showMore}>
          <Box display="flex" gap={1} mb={1}>
            <Button
              startIcon={<DescriptionIcon />}
              onClick={() => setShowDescription(true)}
              size="small"
              sx={{
                textTransform: "none",
                color: "text.secondary",
              }}
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
        >
          <TextField
            fullWidth
            label={!showMore ? t("event.form.description") : ""}
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
