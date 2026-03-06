import { Box } from "@linagora/twake-mui";
import { useI18n } from "twake-i18n";

interface WeekDaySelectorProps {
  selectedDays: number[]; // FullCalendar format: 0=Sun, 1=Mon...
  onChange: (days: number[]) => void;
  disabled?: boolean;
}

export const FC_DAYS = [
  { fc: 1, ics: "MO" },
  { fc: 2, ics: "TU" },
  { fc: 3, ics: "WE" },
  { fc: 4, ics: "TH" },
  { fc: 5, ics: "FR" },
  { fc: 6, ics: "SA" },
  { fc: 0, ics: "SU" },
];

export function WeekDaySelector({
  selectedDays,
  onChange,
  disabled,
}: WeekDaySelectorProps) {
  const { t } = useI18n();

  const getDayLabel = (ics: string) => {
    const dayMap: Record<string, string> = {
      MO: t("event.repeat.days.monday"),
      TU: t("event.repeat.days.tuesday"),
      WE: t("event.repeat.days.wednesday"),
      TH: t("event.repeat.days.thursday"),
      FR: t("event.repeat.days.friday"),
      SA: t("event.repeat.days.saturday"),
      SU: t("event.repeat.days.sunday"),
    };
    return dayMap[ics] || ics;
  };

  const handleToggle = (fcDay: number) => {
    if (disabled) return;
    const updated = selectedDays.includes(fcDay)
      ? selectedDays.filter((d) => d !== fcDay)
      : [...selectedDays, fcDay];
    onChange(updated);
  };

  return (
    <Box display="flex" gap={1}>
      {FC_DAYS.map(({ fc, ics }) => {
        const isSelected = selectedDays.includes(fc);
        const fullLabel = getDayLabel(ics);

        return (
          <Box
            component="button"
            type="button"
            key={ics}
            aria-label={fullLabel}
            aria-pressed={isSelected}
            onClick={() => handleToggle(fc)}
            disabled={disabled}
            sx={{
              width: 40,
              height: 40,
              borderRadius: "4px",
              border: "1px solid",
              borderColor: isSelected ? "primary.main" : "#AEAEC0",
              color: isSelected ? "#fff" : "#8C9CAF",
              fontSize: 16,
              fontWeight: 400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: isSelected ? "primary.main" : "transparent",
              cursor: disabled ? "default" : "pointer",
              "&:hover": !disabled
                ? {
                    borderColor: "primary.main",
                    bgcolor: "primary.main",
                    color: "#fff",
                  }
                : undefined,
            }}
          >
            {fullLabel.charAt(0)}
          </Box>
        );
      })}
    </Box>
  );
}
