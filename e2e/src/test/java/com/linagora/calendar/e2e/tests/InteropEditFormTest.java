package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.backend.Vcal;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.EventPreviewPopover;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * Saving, from the edit form, an event another client wrote.
 *
 * <p>Each test seeds the calendar object the way Outlook, Google or a generator stores it, renames
 * the event -- the smallest change a user makes -- and reads back what reached the server: a
 * rename must not move the event, reset the answers of its guests, or drop what the form does
 * not model.
 */
class InteropEditFormTest extends TwakeCalendarE2ETest {
    private static final Duration SAVED = Duration.ofSeconds(30);
    private static final String STAMP = "DTSTAMP:20260101T000000Z";

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private static String guest() {
        return "guest-" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    /** Seeds the object, shows it in the grid, renames it from the edit form, and waits for the write. */
    private String seedThenRename(Page page, E2EUser user, CalendarProbe probe, String title,
                                  String icalendar) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        probe.putEvent(user, UUID.randomUUID().toString(), icalendar);
        calendar.reload();
        awaitAttached(calendar.eventCard(title));

        String renamed = title(title.split(" ")[0] + " renamed");
        EventFormModal form = calendar.openEvent(title).edit();
        form.title(renamed);
        form.save();

        Awaitility.await().atMost(SAVED).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).contains("SUMMARY:" + renamed));
        return Ics.event(probe.singleEvent(user));
    }

    @Test
    @DisplayName("INTEROP-01 (#1902) An all day event without DTEND keeps a one day end, and its answers, on save")
    void anAllDayEventWithoutEndKeepsOneDay(Page page, E2EUser user, CalendarProbe probe) {
        LocalDate today = E2EClock.today();
        String title = title("Dateonly");
        String guest = guest();

        String saved = seedThenRename(page, user, probe, title, Vcal.calendar("""
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART;VALUE=DATE:%s
            SUMMARY:%s
            ORGANIZER:mailto:%s
            ATTENDEE;PARTSTAT=ACCEPTED:mailto:%s
            ATTENDEE;PARTSTAT=ACCEPTED;RSVP=TRUE:mailto:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, Vcal.day(today), title, user.email(),
            user.email(), guest)));

        assertThat(Ics.property(saved, "DTSTART")).hasValue(Vcal.day(today));
        // RFC 5545: an all day event without DTEND lasts one day; written out, that is the next day
        Ics.property(saved, "DTEND").ifPresent(end -> assertThat(end)
            .as("a rename must not give the event another end")
            .isEqualTo(Vcal.day(today.plusDays(1))));
        assertThat(Vcal.attendeeLines(saved, guest))
            .as("the event did not move: the guest's answer stays")
            .singleElement().satisfies(line -> assertThat(Vcal.partstat(line)).isEqualTo("ACCEPTED"));
    }

    @Test
    @DisplayName("INTEROP-02 (#1903) An organizer listed among the attendees in another case is written once")
    void anOrganizerListedInAnotherCaseIsNotDuplicated(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Casing");
        String day = Vcal.day(E2EClock.today());

        String saved = seedThenRename(page, user, probe, title, Vcal.calendar("""
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART:%sT080000Z
            DTEND:%sT090000Z
            SUMMARY:%s
            ORGANIZER:mailto:%s
            ATTENDEE;PARTSTAT=ACCEPTED;CN=Organizer:MAILTO:%s
            ATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, day, day, title, user.email(),
            user.email().toUpperCase(java.util.Locale.ROOT), guest())));

        assertThat(Vcal.attendeeLines(saved, user.email()))
            .as("MAILTO:USER@X and mailto:user@x are one attendee, not two")
            .singleElement().satisfies(line -> assertThat(Vcal.partstat(line)).isEqualTo("ACCEPTED"));
    }

    @Test
    @DisplayName("INTEROP-03 (#1904) Two rooms sharing a name keep their own answers on save")
    void homonymousRoomsKeepTheirOwnAnswers(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Rooms");
        String day = Vcal.day(E2EClock.today());
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String declined = "room-a-" + suffix + "@example.com";
        String accepted = "room-b-" + suffix + "@example.com";

        String saved = seedThenRename(page, user, probe, title, Vcal.calendar("""
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART:%sT080000Z
            DTEND:%sT090000Z
            SUMMARY:%s
            ORGANIZER:mailto:%s
            ATTENDEE;PARTSTAT=ACCEPTED:mailto:%s
            ATTENDEE;CUTYPE=RESOURCE;CN=Meeting room;PARTSTAT=DECLINED:mailto:%s
            ATTENDEE;CUTYPE=RESOURCE;CN=Meeting room;PARTSTAT=ACCEPTED:mailto:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, day, day, title, user.email(), user.email(),
            declined, accepted)));

        assertThat(Vcal.attendeeLines(saved, declined)).singleElement()
            .satisfies(line -> assertThat(Vcal.partstat(line)).isEqualTo("DECLINED"));
        assertThat(Vcal.attendeeLines(saved, accepted))
            .as("a room is told apart from another by its address, not by its name")
            .singleElement().satisfies(line -> assertThat(Vcal.partstat(line)).isEqualTo("ACCEPTED"));
    }

    @Test
    @DisplayName("INTEROP-04 (#1905) A start carrying seconds keeps them, and the answers, on save")
    void secondsOfTheStartSurviveASave(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Seconds");
        String day = Vcal.day(E2EClock.today());
        String guest = guest();

        String saved = seedThenRename(page, user, probe, title, Vcal.calendar("""
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART:%sT080030Z
            DTEND:%sT090030Z
            SUMMARY:%s
            ORGANIZER:mailto:%s
            ATTENDEE;PARTSTAT=ACCEPTED:mailto:%s
            ATTENDEE;PARTSTAT=ACCEPTED;RSVP=TRUE:mailto:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, day, day, title, user.email(), user.email(), guest)));

        assertThat(Ics.property(saved, "DTSTART").orElseThrow())
            .as("the form shows minutes, but a rename must not move the event by 30 seconds")
            .matches("\\d{8}T\\d{4}30Z?");
        assertThat(Ics.property(saved, "DTEND").orElseThrow()).matches("\\d{8}T\\d{4}30Z?");
        assertThat(Vcal.attendeeLines(saved, guest)).singleElement()
            .satisfies(line -> assertThat(Vcal.partstat(line)).isEqualTo("ACCEPTED"));
    }

    @Test
    @DisplayName("INTEROP-05 (#1906) An event in a zone the browser does not know opens in the edit form")
    void anUnknownZoneOpensTheEditForm(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Martian");
        String day = Vcal.day(E2EClock.today());

        // seedThenRename goes through the edit form: before the fix it never opened
        String saved = seedThenRename(page, user, probe, title, Vcal.calendar(
            Vcal.fixedZone("Mars/Olympus_Mons", "+0100"), """
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART;TZID=Mars/Olympus_Mons:%sT090000
            DTEND;TZID=Mars/Olympus_Mons:%sT100000
            SUMMARY:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, day, day, title)));

        assertThat(Ics.property(saved, "DTSTART")).isPresent();
    }

    @Test
    @DisplayName("INTEROP-06 (#1885) An event in a custom zone is not written as UTC with a TZID")
    void aCustomZoneIsNotWrittenAsUtcWithATzid(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Customized");
        String day = Vcal.day(E2EClock.today());

        String saved = seedThenRename(page, user, probe, title, Vcal.calendar(
            Vcal.fixedZone("Customized Time Zone", "+0100"), """
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART;TZID=Customized Time Zone:%sT090000
            DTEND;TZID=Customized Time Zone:%sT100000
            SUMMARY:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, day, day, title)));

        for (String property : new String[] {"DTSTART", "DTEND"}) {
            boolean utc = Ics.property(saved, property).orElseThrow().endsWith("Z");
            boolean zoned = Ics.parameters(saved, property).contains("TZID=");
            assertThat(utc && zoned)
                .as("RFC 5545: a UTC value carries no TZID (%s:%s%s)", property,
                    Ics.parameters(saved, property), Ics.property(saved, property).orElseThrow())
                .isFalse();
        }
    }

    @Test
    @DisplayName("INTEROP-07 (#1907) The SENT-BY of the organizer survives a save by that organizer")
    void sentByOfTheOrganizerIsKept(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Delegated");
        String day = Vcal.day(E2EClock.today());

        String saved = seedThenRename(page, user, probe, title, Vcal.calendar("""
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART:%sT080000Z
            DTEND:%sT090000Z
            SUMMARY:%s
            ORGANIZER;SENT-BY="mailto:assistant@example.com":mailto:%s
            ATTENDEE;PARTSTAT=ACCEPTED:mailto:%s
            ATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, day, day, title, user.email(), user.email(),
            guest())));

        assertThat(Ics.parameters(saved, "ORGANIZER"))
            .as("guests are told the invitation was sent by the assistant")
            .containsIgnoringCase("SENT-BY=\"mailto:assistant@example.com\"");
    }

    @Test
    @DisplayName("INTEROP-08 (#1981) An event whose RRULE has no FREQ stays in the grid and opens")
    void anRruleWithoutFreqStillOpens(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("No frequency");
        String day = Vcal.day(E2EClock.today());
        CalendarPage calendar = LoginPage.loginAs(page, user);
        // Sabre only refuses this rule to a client asking for handling=strict: another client gets it stored
        probe.putEvent(user, UUID.randomUUID().toString(), Vcal.calendar("""
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART:%sT080000Z
            DTEND:%sT083000Z
            RRULE:COUNT=6
            SUMMARY:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, day, day, title)));
        calendar.reload();
        awaitAttached(calendar.eventCard(title));

        assertThat(calendar.openEvent(title).text())
            .as("reading the rule threw: the event was dropped and could not be opened")
            .contains(title);
    }

    @Test
    @DisplayName("INTEROP-09 (#1999) An event with a TZID and a DURATION ends a duration after its start")
    void aDurationCountsFromTheStartInItsZone(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Lasting");
        String day = Vcal.day(E2EClock.today());
        CalendarPage calendar = LoginPage.loginAs(page, user);
        probe.putEvent(user, UUID.randomUUID().toString(), Vcal.calendar("""
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART;TZID=America/New_York:%sT100000
            DURATION:PT1H
            SUMMARY:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, day, title)));
        calendar.reload();
        awaitAttached(calendar.eventCard(title));

        EventFormModal form = calendar.openEvent(title).edit().expand();
        assertThat(form.startTime()).isEqualTo("10:00");
        assertThat(form.endTime())
            .as("the end was computed from the start read in the zone of the browser, hours off")
            .isEqualTo("11:00");
        String renamed = title("Lasting renamed");
        form.title(renamed);
        form.save();

        Awaitility.await().atMost(SAVED).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).contains("SUMMARY:" + renamed));
        String saved = Ics.event(probe.singleEvent(user));
        assertThat(Ics.property(saved, "DTSTART")).hasValue(day + "T100000");
        assertThat(Ics.parameters(saved, "DTSTART")).contains("TZID=America/New_York");
        assertThat(Ics.property(saved, "DTEND").map(end -> end.equals(day + "T110000"))
            .or(() -> Ics.property(saved, "DURATION").map("PT1H"::equals)))
            .as("the event still lasts one hour:\n%s", saved)
            .hasValue(true);
        Ics.property(saved, "DTEND").ifPresent(end ->
            assertThat(Ics.parameters(saved, "DTEND")).contains("TZID=America/New_York"));
    }

    @Test
    @DisplayName("INTEROP-10 (#2000) In a zone whose offset has seconds, a save keeps the stored end and the answers")
    void aZoneOffsetWithSecondsKeepsTheStoredEnd(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Monrovia");
        String uid = UUID.randomUUID().toString();
        String guest = guest();
        LoginPage.loginAs(page, user);
        // Liberia was at -00:44:30 until 1972, out of reach of the grid: a link opens the event
        probe.putEvent(user, uid, Vcal.calendar("""
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART;TZID=Africa/Monrovia:19700611T100000
            DTEND;TZID=Africa/Monrovia:19700611T103045
            SUMMARY:%s
            ORGANIZER:mailto:%s
            ATTENDEE;PARTSTAT=ACCEPTED:mailto:%s
            ATTENDEE;PARTSTAT=ACCEPTED;RSVP=TRUE:mailto:%s
            END:VEVENT
            """.formatted(uid, STAMP, title, user.email(), user.email(), guest)));

        page.navigate("/events/" + uid);
        page.getByLabel("Edit event").waitFor();
        EventFormModal form = new EventPreviewPopover(page).edit();
        String renamed = title("Monrovia renamed");
        form.title(renamed);
        form.save();

        Awaitility.await().atMost(SAVED).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).contains("SUMMARY:" + renamed));
        String saved = Ics.event(probe.singleEvent(user));
        assertThat(Ics.property(saved, "DTEND"))
            .as("the form shows minutes, but a rename must not move the end")
            .hasValue("19700611T103045");
        assertThat(Vcal.attendeeLines(saved, guest))
            .as("a rename is not a change of time: the guest keeps their answer")
            .singleElement()
            .satisfies(line -> assertThat(Vcal.partstat(line)).isEqualTo("ACCEPTED"));
    }
}
