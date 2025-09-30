import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  createCalendarAsync,
  importEventFromFileAsync,
  patchACLCalendarAsync,
  patchCalendarAsync,
} from "../../features/Calendars/CalendarSlice";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { AccessTab } from "./AccessTab";
import { ImportTab } from "./ImportTab";
import { SettingsTab } from "./SettingsTab";

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
  const dispatch = useAppDispatch();
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const calendars = useAppSelector((state) => state.calendars.list);
  const isOwn = calendar ? calendar?.id.split("/")[0] === userId : true;

  // existing calendar params
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("public");

  // import tab state
  const [tab, setTab] = useState<"settings" | "access" | "import">("settings");
  const [importedContent, setImportedContent] = useState<File | null>(null);
  const [importTarget, setImportTarget] = useState("new");

  // new calendar params (for import new)
  const [newCalName, setNewCalName] = useState("");
  const [newCalDescription, setNewCalDescription] = useState("");
  const [newCalColor, setNewCalColor] = useState("");
  const [newCalVisibility, setNewCalVisibility] = useState<
    "public" | "private"
  >("public");

  useEffect(() => {
    if (!open) return;
    if (calendar) {
      setName(calendar.name);
      setDescription(calendar.description ?? "");
      setColor(calendar.color ?? "");
      setVisibility(calendar.visibility ?? "public");
      setImportTarget(calendar.id ?? "new");
    } else {
      setName("");
      setDescription("");
      setColor("");
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
    color: string,
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
    setColor("");
    setTab("settings");
    setVisibility("public");
    setImportTarget("new");
    setImportedContent(null);

    setNewCalName("");
    setNewCalDescription("");
    setNewCalColor("");
    setNewCalVisibility("public");
  };

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => handleClose(e, reason)}
      maxWidth="lg"
      slotProps={{
        paper: {
          sx: { width: "40vw" },
        },
      }}
    >
      <DialogTitle>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab
            value="settings"
            label={calendar ? "Settings" : "Add new calendar"}
          />
          {calendar && <Tab value="access" label="Access" />}
          {isOwn && <Tab value="import" label="Import" />}
        </Tabs>
      </DialogTitle>
      <DialogContent>
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
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          onClick={(e) => handleClose({}, "backdropClick")}
        >
          Cancel
        </Button>
        <Button
          disabled={tab === "import" ? !importedContent : !name.trim()}
          variant="contained"
          onClick={tab === "import" ? handleImport : handleSave}
        >
          {tab === "import" ? "Import" : calendar ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CalendarPopover;
