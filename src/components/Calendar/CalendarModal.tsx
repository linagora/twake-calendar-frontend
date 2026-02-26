import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import {
  createCalendarAsync,
  importEventFromFileAsync,
  patchACLCalendarAsync,
  patchCalendarAsync,
} from "@/features/Calendars/services";
import { updateDelegationCalendarAsync } from "@/features/Calendars/services/updateDelegationCalendarAsync";
import { accessRightToDavProp } from "@/utils/accessRightToDavProp";
import { defaultColors } from "@/utils/defaultColors";
import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";
import { Button, Tab, Tabs } from "@linagora/twake-mui";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "twake-i18n";
import { ResponsiveDialog } from "../Dialog";
import { ErrorSnackbar } from "../Error/ErrorSnackbar";
import { AccessTab } from "./AccessTab";
import { UserWithAccess } from "./CalendarAccessRights";
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
  calendar?: Calendar;
}) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.user.userData) ?? {};
  const calendars = useAppSelector((state) => state.calendars.list);
  const isOwn = calendar?.id
    ? extractEventBaseUuid(calendar.id) === userData.openpaasId
    : true;

  // existing calendar params
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<Record<string, string>>(defaultColors[0]);
  const [visibility, setVisibility] = useState<"private" | "public">("public");

  // access tab state
  const [usersWithAccess, setUsersWithAccess] = useState<UserWithAccess[]>([]);

  // Snapshot of the invitee list as loaded from calendar.invite on open.
  // Used to diff on save: what changed vs what was removed.
  const initialUsersRef = useRef<UserWithAccess[]>([]);

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
    setUsersWithAccess([]);
    initialUsersRef.current = [];
  }, [calendar, open]);

  const handleUsersWithAccessChange = useCallback((users: UserWithAccess[]) => {
    setUsersWithAccess(users);
  }, []);

  const handleInvitesLoaded = useCallback((users: UserWithAccess[]) => {
    if (initialUsersRef.current.length === 0) {
      initialUsersRef.current = users;
    }
  }, []);

  const [saveError, setSaveError] = useState("");

  const updateCalendar = async (calId: string, calLink: string) => {
    await dispatch(
      patchCalendarAsync({
        calId,
        calLink,
        patch: { name: name.trim(), desc: description.trim(), color },
      })
    ).unwrap();
    if (visibility !== calendar?.visibility) {
      await dispatch(
        patchACLCalendarAsync({
          calId,
          calLink,
          request: visibility === "public" ? "{DAV:}read" : "",
        })
      ).unwrap();
    }
  };

  async function updateCalendarInvites(calLink: string) {
    const normaliseEmail = (u: UserWithAccess) =>
      u.email?.trim().toLowerCase() ?? "";

    const currentMap = new Map(
      usersWithAccess
        .filter((u) => !!normaliseEmail(u))
        .map((u) => [normaliseEmail(u), u])
    );

    const set = usersWithAccess
      .filter((u) => !!normaliseEmail(u))
      .map((u) => ({
        "dav:href": `mailto:${normaliseEmail(u)}`,
        [accessRightToDavProp(u.accessRight)]: true,
      }));

    const remove = initialUsersRef.current
      .filter((u) => !!normaliseEmail(u) && !currentMap.has(normaliseEmail(u)))
      .map((u) => ({ "dav:href": `mailto:${normaliseEmail(u)}` }));

    if (set.length === 0 && remove.length === 0) return;

    await dispatch(
      updateDelegationCalendarAsync({
        calId: calendar?.id,
        calLink,
        share: { set, remove },
      })
    ).unwrap();
  }

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
        userData,
        calId,
      })
    );
    dispatch(
      patchACLCalendarAsync({
        calId: `${userData.openpaasId}/${calId}`,
        calLink: `/calendars/${userData.openpaasId}/${calId}.json`,
        request: visibility === "public" ? "{DAV:}read" : "",
      })
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (calendar) {
      try {
        await updateCalendar(calendar.id, calendar.link);
        await updateCalendarInvites(calendar.link);
      } catch {
        setSaveError(t("error.title"));
        return;
      }
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
        if (importedContent) {
          dispatch(
            importEventFromFileAsync({
              calLink: `/calendar/${userData.openpaasId}/${calId}.json`,
              file: importedContent,
            })
          );
        }
      }
    } else {
      if (importedContent) {
        dispatch(
          importEventFromFileAsync({
            calLink: calendars[importTarget].link,
            file: importedContent,
          })
        );
      }
    }
    handleClose({}, "backdropClick");
  };

  const handleClose = (
    e: object | null,
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
    setUsersWithAccess([]);
    initialUsersRef.current = [];
    setSaveError("");
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
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
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
        <>
          <Button
            variant="outlined"
            onClick={() => handleClose({}, "backdropClick")}
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
        </>
      }
    >
      {tab === "import" && (
        <ImportTab
          importTarget={importTarget}
          setImportTarget={setImportTarget}
          setImportedContent={setImportedContent}
          userId={userData.openpaasId ?? ""}
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
      {tab === "access" && calendar && (
        <AccessTab
          calendar={calendar}
          usersWithAccess={usersWithAccess}
          onUsersWithAccessChange={handleUsersWithAccessChange}
          onInvitesLoaded={handleInvitesLoaded}
        />
      )}
      <ErrorSnackbar error={saveError} type="calendar" />
    </ResponsiveDialog>
  );
}

export default CalendarPopover;
