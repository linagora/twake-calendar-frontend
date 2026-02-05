import { TextField } from "@linagora/twake-mui";
import { Notes as NotesIcon } from "@mui/icons-material";
import React from "react";
import { useI18n } from "twake-i18n";
import { FieldWithLabel } from "./components/FieldWithLabel";
import { SectionPreviewRow } from "./components/SectionPreviewRow";

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
  const descriptionInputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (showDescription) {
      descriptionInputRef.current?.focus();
    }
  }, [showDescription]);

  const descriptionField = (
    <FieldWithLabel
      label={t("event.form.description")}
      isExpanded={showMore}
      sx={{ padding: 0, margin: 0 }}
    >
      <TextField
        fullWidth
        label=""
        inputRef={descriptionInputRef}
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
  );

  if (showMore) {
    return descriptionField;
  }

  return (
    <>
      {!showDescription && (
        <FieldWithLabel label="" isExpanded={showMore}>
          <SectionPreviewRow
            icon={<NotesIcon />}
            onClick={() => setShowDescription(true)}
          >
            {t("event.form.addDescription")}
          </SectionPreviewRow>
        </FieldWithLabel>
      )}
      {showDescription && descriptionField}
    </>
  );
}
