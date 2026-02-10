import { api } from "@/utils/apiUtils";
import { TIMEZONES } from "@/utils/timezone-data";
import {
  VCalComponent,
  VObjectProperty,
} from "../../Calendars/types/CalendarData";
import { getAllRecurrentEvent } from "../EventApi";
import { CalendarEvent } from "../EventsTypes";
import { makeTimezone, makeVevent } from "../eventUtils";

const METADATA_FIELDS = [
  "summary",
  "description",
  "location",
  "class",
  "transp",
  "attendee",
  "organizer",
  "x-openpaas-videoconference",
] as const;

// Helper function to get field values from props
const getFieldValues = (props: VObjectProperty[], fieldName: string) => {
  return props.filter(([k]) => k.toLowerCase() === fieldName.toLowerCase());
};

// Helper function to find a single field value from props
const findFieldValue = (props: VObjectProperty[], fieldName: string) => {
  return props.find(([k]) => k.toLowerCase() === fieldName.toLowerCase());
};

// Helper function to serialize for comparison
const serialize = (values: VObjectProperty[] | VCalComponent[]) => {
  return JSON.stringify(values);
};

// Helper function to filter components by name
const filterComponentsByName = (components: VCalComponent[], name: string) => {
  return components.filter(
    ([componentName]) => componentName.toLowerCase() === name.toLowerCase()
  );
};

// Detect which metadata fields changed between old and new master
const detectChangedMetadataFields = (
  oldMasterProps: VObjectProperty[],
  newMasterProps: VObjectProperty[]
) => {
  const changedFields = new Map<string, VObjectProperty[]>();

  METADATA_FIELDS.forEach((fieldName) => {
    const oldValues = getFieldValues(oldMasterProps, fieldName);
    const newValues = getFieldValues(newMasterProps, fieldName);

    if (serialize(oldValues) !== serialize(newValues)) {
      changedFields.set(fieldName.toLowerCase(), newValues);
    }
  });

  return changedFields;
};

// Check if VALARM component changed between old and new master
const detectValarmChanges = (
  oldMaster: VCalComponent,
  updatedMaster: VCalComponent
) => {
  const oldMasterComponents = oldMaster[2] || [];
  const newMasterComponents = updatedMaster[2] || [];

  const oldValarm = filterComponentsByName(oldMasterComponents, "valarm");
  const newValarm = filterComponentsByName(newMasterComponents, "valarm");

  const valarmChanged = serialize(oldValarm) !== serialize(newValarm);

  return { valarmChanged, newValarm };
};

// Apply changed metadata fields to a vevent's properties
const applyMetadataChanges = (
  props: VObjectProperty[],
  changedFields: Map<string, VObjectProperty[]>
) => {
  let newProps = [...props];

  changedFields.forEach((newValues, fieldNameLower) => {
    // Remove old values of this changed field from exception
    const filteredProps = newProps.filter(
      ([k]) => k.toLowerCase() !== fieldNameLower
    );

    // Add new values from updated master
    newProps = [...filteredProps, ...newValues];
  });

  return newProps;
};

// Increment the sequence number in properties
const incrementSequenceNumber = (props: VObjectProperty[]) => {
  const newProps = [...props];
  const sequenceIndex = newProps.findIndex(
    ([k]) => k.toLowerCase() === "sequence"
  );

  if (sequenceIndex !== -1) {
    const currentSequence = parseInt(
      (newProps[sequenceIndex][3] as string) || "0",
      10
    );
    newProps[sequenceIndex] = [
      newProps[sequenceIndex][0],
      newProps[sequenceIndex][1],
      newProps[sequenceIndex][2],
      String(currentSequence + 1),
    ];
  } else {
    newProps.push(["sequence", {}, "integer", "1"]);
  }

  return newProps;
};

// Update VALARM components if they changed
const updateValarmComponents = (
  components: VCalComponent[],
  newValarm: VCalComponent[]
) => {
  return components
    .filter(([name]) => name.toLowerCase() !== "valarm")
    .concat(newValarm);
};

// Update a single vevent with metadata changes
const updateVeventWithMetadataChanges = (
  vevent: VCalComponent,
  index: number,
  masterIndex: number,
  updatedMaster: VCalComponent,
  changedFields: Map<string, VObjectProperty[]>,
  valarmChanged: boolean,
  newValarm: VCalComponent[]
): VCalComponent => {
  if (index === masterIndex) {
    return updatedMaster;
  }

  const [veventType, props, components = []] = vevent;

  // Apply metadata changes
  let newProps = applyMetadataChanges(props, changedFields);

  // Increment sequence number if any changes were made
  if (changedFields.size > 0 || valarmChanged) {
    newProps = incrementSequenceNumber(newProps);
  }

  // Handle VALARM component updates
  let updatedComponents = components;
  if (valarmChanged) {
    updatedComponents = updateValarmComponents(components, newValarm);
  }

  return [veventType, newProps, updatedComponents];
};

// Update all vevents with metadata changes while preserving overrides
const updateVeventsPreservingOverrides = (
  vevents: VCalComponent[],
  oldMaster: VCalComponent,
  updatedMaster: VCalComponent,
  masterIndex: number
) => {
  const oldMasterProps = oldMaster[1];
  const newMasterProps = updatedMaster[1];

  // Detect which fields changed in the master
  const changedFields = detectChangedMetadataFields(
    oldMasterProps,
    newMasterProps
  );

  // Check if VALARM component changed
  const { valarmChanged, newValarm } = detectValarmChanges(
    oldMaster,
    updatedMaster
  );

  // Update all vevents
  return vevents.map((vevent, index) =>
    updateVeventWithMetadataChanges(
      vevent,
      index,
      masterIndex,
      updatedMaster,
      changedFields,
      valarmChanged,
      newValarm
    )
  );
};

export const updateSeries = async (
  event: CalendarEvent,
  calOwnerEmail?: string,
  removeOverrides: boolean = true
) => {
  const vevents = (await getAllRecurrentEvent(event)) as VCalComponent[];
  const masterIndex = vevents.findIndex(
    ([, props]) => !findFieldValue(props, "recurrence-id")
  );

  if (masterIndex === -1) {
    throw new Error("No master VEVENT found for this series");
  }

  const rrule = findFieldValue(vevents[masterIndex][1], "rrule");
  const tzid = event.timezone;
  const oldMaster = vevents[masterIndex];

  const updatedMaster = makeVevent(
    event,
    tzid,
    calOwnerEmail,
    true
  ) as VCalComponent;
  const newRrule = findFieldValue(updatedMaster[1], "rrule");
  if (!newRrule) {
    updatedMaster[1].push(rrule!);
  }

  const timezoneData = TIMEZONES.zones[event.timezone];
  const vtimezone = makeTimezone(timezoneData, event);

  let finalVevents: VCalComponent[];

  if (removeOverrides) {
    // When date/time/timezone/repeat rules changed, remove all override instances
    finalVevents = [updatedMaster];
  } else {
    // When only properties changed, keep override instances and update their metadata
    finalVevents = updateVeventsPreservingOverrides(
      vevents,
      oldMaster,
      updatedMaster,
      masterIndex
    );
  }

  const newJCal = [
    "vcalendar",
    [],
    [...finalVevents, vtimezone.component.jCal],
  ];

  return api(`dav${event.URL}`, {
    method: "PUT",
    body: JSON.stringify(newJCal),
    headers: {
      "content-type": "text/calendar; charset=utf-8",
    },
  });
};
