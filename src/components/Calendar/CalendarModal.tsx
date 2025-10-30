import { Button, DialogActions, Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  createCalendarAsync,
  importEventFromFileAsync,
  patchACLCalendarAsync,
  patchCalendarAsync,
} from "../../features/Calendars/CalendarSlice";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { ResponsiveDialog } from "../Dialog";
import { AccessTab } from "./AccessTab";
import { ImportTab } from "./ImportTab";
import { SettingsTab } from "./SettingsTab";
import { defaultColors } from "./utils/calendarColorsUtils";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";

function CalendarPopover({
  open,
  onClose,
  calendar,
}: {
  open: boolean;
  onClose: (
    event: object | null,
    reason: "backdropClick" | "escapeKeyDown"
  ) => void;
  calendar?: Calendars;
}) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const calendars = useAppSelector((state) => state.calendars.list);
  const isOwn = calendar ? calendar?.id.split("/")[0] === userId : true;

  // existing calendar params
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<Record<string, string>>(defaultColors[0]);
  const [visibility, setVisibility] = useState<"private" | "public">("public");

  // import tab state
  const [tab, setTab] = useState<"settings" | "access" | "import">("settings");
  const [importedContent, setImportedContent] = useState<File | null>(null);
  const [importTarget, setImportTarget] = useState("new");

  // new calendar params (for import new)
  const [newCalName, setNewCalName] = useState("");
  const [newCalDescription, setNewCalDescription] = useState("");
  const [newCalColor, setNewCalColor] = useState(defaultColors[0]);
  const [newCalVisibility, setNewCalVisibility] = useState<
    "public" | "private"
  >("public");

  useEffect(() => {
    if (!open) return;
    if (calendar) {
      setName(calendar.name);
      setDescription(calendar.description ?? "");
      setColor(calendar.color ?? defaultColors[0]);
      setVisibility(calendar.visibility ?? "public");
      setImportTarget(calendar.id ?? "new");
    } else {
      setName("");
      setDescription("");
      setColor(defaultColors[0]);
      setVisibility("public");
      setImportTarget("new");
    }
  }, [calendar, open]);

  const updateCalendar = (calId: string, calLink: string) => {
    dispatch(
      patchCalendarAsync({
        calId,
        calLink,
        patch: { name: name.trim(), desc: description.trim(), color },
      })
    );
    if (visibility !== calendar?.visibility) {
      dispatch(
        patchACLCalendarAsync({
          calId,
          calLink,
          request: visibility === "public" ? "{DAV:}read" : "",
        })
      );
    }
  };

  const createCalendar = async (
    calId: string,
    name: string,
    desc: string,
    color: Record<string, string>,
    visibility: string
  ) => {
    await dispatch(
      createCalendarAsync({
        name: name.trim(),
        desc: desc.trim(),
        color: color,
        userId,
        calId,
      })
    );
    dispatch(
      patchACLCalendarAsync({
        calId: `${userId}/${calId}`,
        calLink: `/calendars/${userId}/${calId}.json`,
        request: visibility === "public" ? "{DAV:}read" : "",
      })
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (calendar) {
      updateCalendar(calendar.id, calendar.link);
    } else {
      createCalendar(crypto.randomUUID(), name, description, color, visibility);
    }
    handleClose({}, "backdropClick");
  };

  const handleImport = async () => {
    if (importTarget === "new") {
      const calId = crypto.randomUUID();
      if (newCalName.trim()) {
        await createCalendar(
          calId,
          newCalName,
          newCalDescription,
          newCalColor,
          newCalVisibility
        );
        importedContent &&
          dispatch(
            importEventFromFileAsync({
              calLink: `/calendar/${userId}/${calId}.json`,
              file: importedContent,
            })
          );
      }
    } else {
      importedContent &&
        dispatch(
          importEventFromFileAsync({
            calLink: calendars[importTarget].link,
            file: importedContent,
          })
        );
    }
    handleClose({}, "backdropClick");
  };

  const handleClose = (
    e: {},
    reason: "backdropClick" | "escapeKeyDown"
  ): void => {
    onClose(e, reason);
    setName("");
    setDescription("");
    setColor(defaultColors[0]);
    setTab("settings");
    setVisibility("public");
    setImportTarget("new");
    setImportedContent(null);

    setNewCalName("");
    setNewCalDescription("");
    setNewCalColor(defaultColors[0]);
    setNewCalVisibility("public");
  };

  return (
    <ResponsiveDialog
      open={open}
      onClose={() => handleClose({}, "backdropClick")}
      title={
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab
            value="settings"
            label={
              calendar
                ? t("calendarPopover.tabs.settings")
                : t("calendarPopover.tabs.addNew")
            }
          />
          {calendar && (
            <Tab value="access" label={t("calendarPopover.tabs.access")} />
          )}
          {isOwn && (
            <Tab value="import" label={t("calendarPopover.tabs.import")} />
          )}
        </Tabs>
      }
      actions={
        <DialogActions>
          <Button
            variant="outlined"
            onClick={(e) => handleClose({}, "backdropClick")}
          >
            {t("common.cancel")}
          </Button>
          <Button
            disabled={tab === "import" ? !importedContent : !name.trim()}
            variant="contained"
            onClick={tab === "import" ? handleImport : handleSave}
          >
            {tab === "import"
              ? t("actions.import")
              : calendar
                ? t("actions.save")
                : t("actions.create")}
          </Button>
        </DialogActions>
      }
    >
      {tab === "import" && (
        <ImportTab
          importTarget={importTarget}
          setImportTarget={setImportTarget}
          setImportedContent={setImportedContent}
          userId={userId}
          newCalParams={{
            name: newCalName,
            setName: setNewCalName,
            description: newCalDescription,
            setDescription: setNewCalDescription,
            color: newCalColor,
            setColor: setNewCalColor,
            visibility: newCalVisibility,
            setVisibility: setNewCalVisibility,
          }}
        />
      )}
      {tab === "settings" && (
        <SettingsTab
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          color={color}
          setColor={setColor}
          visibility={visibility}
          setVisibility={setVisibility}
          calendar={calendar}
        />
      )}
      {tab === "access" && calendar && <AccessTab calendar={calendar} />}
    </ResponsiveDialog>
  );
}

export default CalendarPopover;
