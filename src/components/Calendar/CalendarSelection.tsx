import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
  IconButton,
  Checkbox,
  Divider,
  ListItem,
  Menu,
  MenuItem,
} from "@linagora/twake-mui";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import AddIcon from "@mui/icons-material/Add";
import { useState, useMemo, useEffect } from "react";
import CalendarPopover from "./CalendarModal";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CalendarSearch from "./CalendarSearch";
import { removeCalendarAsync } from "@/features/Calendars/services";
import { DeleteCalendarDialog } from "./DeleteCalendarDialog";
import { trimLongTextWithoutSpace } from "@/utils/textUtils";
import { useI18n } from "twake-i18n";
import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";

function CalendarAccordion({
  title,
  calendars,
  selectedCalendars,
  handleToggle,
  showAddButton = false,
  onAddClick,
  defaultExpanded = false,
  setOpen,
}: {
  title: string;
  calendars: string[];
  selectedCalendars: string[];
  handleToggle: (id: string) => void;
  showAddButton?: boolean;
  onAddClick?: Function;
  defaultExpanded?: boolean;
  setOpen: Function;
}) {
  const allCalendars = useAppSelector((state) => state.calendars.list);
  const { t } = useI18n();

  const [expended, setExpended] = useState(defaultExpanded);
  useEffect(() => setExpended(defaultExpanded), [defaultExpanded]);

  if (calendars.length === 0 && !showAddButton) return null;
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      expanded={expended}
      style={{ width: "100%", padding: 0, margin: 0, boxShadow: "none" }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${title}-content`}
        id={`${title}-header`}
        className="calendarListHeader"
        onClick={() => setExpended(!expended)}
        sx={{
          "& .MuiAccordionSummary-content": {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          },
        }}
      >
        <Typography component="h3">{title}</Typography>
        {showAddButton && (
          <IconButton
            component="span"
            onClick={(e) => {
              expended && e.stopPropagation();
              onAddClick && onAddClick();
            }}
          >
            <AddIcon />
          </IconButton>
        )}
      </AccordionSummary>
      <AccordionDetails style={{ textAlign: "left", padding: 0 }}>
        {calendars.map((id) => (
          <CalendarSelector
            key={id}
            calendars={allCalendars}
            id={id}
            isPersonal={title === t("calendar.personal")}
            selectedCalendars={selectedCalendars}
            handleCalendarToggle={handleToggle}
            setOpen={() => setOpen(id)}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  );
}

export default function CalendarSelection({
  selectedCalendars,
  setSelectedCalendars,
}: {
  selectedCalendars: string[];
  setSelectedCalendars: Function;
}) {
  const { t } = useI18n();
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const calendars = useAppSelector((state) => state.calendars.list);

  const personalCalendars = Object.keys(calendars || {}).filter(
    (id) => extractEventBaseUuid(id) === userId
  );
  const delegatedCalendars = Object.keys(calendars || {}).filter(
    (id) => extractEventBaseUuid(id) !== userId && calendars[id]?.delegated
  );
  const sharedCalendars = Object.keys(calendars || {}).filter(
    (id) => extractEventBaseUuid(id) !== userId && !calendars?.[id]?.delegated
  );

  const handleCalendarToggle = (name: string) => {
    setSelectedCalendars((prev: string[]) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };
  const [selectedCalId, setSelectedCalId] = useState("");

  const [anchorElCal, setAnchorElCal] = useState<HTMLElement | null>(null);
  const [anchorElCalOthers, setAnchorElCalOthers] =
    useState<HTMLElement | null>(null);

  return (
    <>
      <div>
        <CalendarAccordion
          title={t("calendar.personal")}
          calendars={personalCalendars}
          selectedCalendars={selectedCalendars}
          handleToggle={handleCalendarToggle}
          showAddButton
          onAddClick={() => setAnchorElCal(document.body)}
          setOpen={(id: string) => {
            setAnchorElCal(document.body);
            setSelectedCalId(id);
          }}
          defaultExpanded
        />

        <CalendarAccordion
          title={t("calendar.delegated")}
          calendars={delegatedCalendars}
          selectedCalendars={selectedCalendars}
          handleToggle={handleCalendarToggle}
          setOpen={(id: string) => {
            setAnchorElCal(document.body);
            setSelectedCalId(id);
          }}
          defaultExpanded={selectedCalendars.some((id) =>
            delegatedCalendars.includes(id)
          )}
        />

        <CalendarAccordion
          title={t("calendar.other")}
          calendars={sharedCalendars}
          selectedCalendars={selectedCalendars}
          showAddButton
          onAddClick={() => {
            setAnchorElCalOthers(document.body);
          }}
          handleToggle={handleCalendarToggle}
          setOpen={(id: string) => {
            setAnchorElCal(document.body);
            setSelectedCalId(id);
          }}
          defaultExpanded={selectedCalendars.some((id) =>
            sharedCalendars.includes(id)
          )}
        />
      </div>
      <CalendarPopover
        open={Boolean(anchorElCal)}
        calendar={calendars?.[selectedCalId] ?? undefined}
        onClose={() => {
          setSelectedCalId("");
          setAnchorElCal(null);
        }}
      />
      <CalendarSearch
        anchorEl={anchorElCalOthers}
        open={Boolean(anchorElCalOthers)}
        onClose={(newCalIds?: string[]) => {
          setAnchorElCalOthers(null);
          if (newCalIds?.length) {
            newCalIds.forEach((id) => handleCalendarToggle(id));
          }
        }}
      />
    </>
  );
}

function CalendarSelector({
  calendars,
  id,
  isPersonal,
  selectedCalendars,
  handleCalendarToggle,
  setOpen,
}: {
  calendars: Record<string, Calendar>;
  id: string;
  isPersonal: boolean;
  selectedCalendars: string[];
  handleCalendarToggle: (name: string) => void;
  setOpen: Function;
}) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const calLink =
    useAppSelector((state) => state.calendars.list[id].link) ?? "";

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const [userId, calId] = id.split("/");
  const isDefault = isPersonal && userId === calId;

  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const handleDeleteConfirm = () => {
    dispatch(removeCalendarAsync({ calId: id, calLink }));
    setDeletePopupOpen(false);
    handleClose();
  };

  const trimmedName = useMemo(
    () => trimLongTextWithoutSpace(calendars[id].name),
    [calendars, id]
  );
  return (
    <>
      <ListItem
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background-color 0.2s ease",
          padding: "8px 24px 8px 16px",
          "& .MoreBtn": { opacity: 0 },
          "&:hover": {
            backgroundColor: "#F3F3F6",
            "& .MoreBtn": { opacity: 1 },
          },
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            maxWidth: "calc(100% - 40px)",
            overflow: "hidden",
          }}
        >
          <Checkbox
            sx={{
              color: calendars[id].color?.light,
              "&.Mui-checked": { color: calendars[id].color?.light },
            }}
            size="small"
            checked={selectedCalendars.includes(id)}
            onChange={() => handleCalendarToggle(id)}
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: "break-word",
            }}
          >
            {trimmedName}
          </span>
        </label>
        <IconButton className="MoreBtn" onClick={handleClick}>
          <MoreVertIcon />
        </IconButton>
      </ListItem>
      <Menu id={id} anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem
          onClick={() => {
            setOpen();
            handleClose();
          }}
        >
          {t("actions.modify")}
        </MenuItem>
        {!isDefault && <Divider />}
        {!isDefault && (
          <MenuItem onClick={() => setDeletePopupOpen(!deletePopupOpen)}>
            {isPersonal ? t("actions.delete") : t("actions.remove")}
          </MenuItem>
        )}
      </Menu>

      <DeleteCalendarDialog
        deletePopupOpen={deletePopupOpen}
        setDeletePopupOpen={setDeletePopupOpen}
        calendars={calendars}
        id={id}
        isPersonal={isPersonal}
        handleDeleteConfirm={handleDeleteConfirm}
      />
    </>
  );
}
