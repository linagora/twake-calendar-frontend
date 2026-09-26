package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.E2EUserFactory;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

/** iCalendar interoperability defects this project has already shipped. */
class PastIcalInteropTest extends TwakeCalendarE2ETest {

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    @Test
    @DisplayName("PAST-45 (#638) Updating an event preserves the properties the SPA does not manage")
    void updatingKeepsUnmanagedProperties(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String uid = UUID.randomUUID().toString();
        String title = "Imported event";
        String stamp = E2EClock.today().toString().replace("-", "");
        probe.putEvent(user, uid, """
            BEGIN:VCALENDAR
            VERSION:2.0
            PRODID:-//linagora//twake-calendar-e2e//EN
            BEGIN:VEVENT
            UID:%s
            DTSTAMP:%sT080000Z
            DTSTART:%sT080000Z
            DTEND:%sT090000Z
            SUMMARY:%s
            X-E2E-CUSTOM:kept-across-updates
            END:VEVENT
            END:VCALENDAR
            """.formatted(uid, stamp, stamp, stamp, title).replace("\n", "\r\n"));
        page.reload();
        calendar.waitUntilLoaded();
        awaitAttached(calendar.eventCard(title));

        String renamed = title("Imported renamed");
        var edited = calendar.openEvent(title).edit();
        edited.title(renamed);
        edited.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            String ical = probe.singleEvent(user);
            assertThat(ical).contains("SUMMARY:" + renamed);
            assertThat(ical)
                .as("an update must not drop the properties it knows nothing about")
                .contains("X-E2E-CUSTOM:kept-across-updates");
        });
    }

    @Test
    @DisplayName("PAST-46 (#318) SEQUENCE starts on creation and grows on every update")
    void sequenceGrowsOnEveryUpdate(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Sequenced");
        calendar.createEvent(title);
        int created = Integer.parseInt(
            Ics.property(Ics.event(probe.singleEvent(user)), "SEQUENCE").orElse("-1"));
        assertThat(created).as("SEQUENCE must be there from the start").isGreaterThanOrEqualTo(0);

        String renamed = title("Sequenced again");
        var edited = calendar.openEvent(title).edit();
        edited.title(renamed);
        edited.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Integer.parseInt(
                Ics.property(Ics.event(probe.singleEvent(user)), "SEQUENCE").orElse("-1")))
                .as("guests order the updates they receive by SEQUENCE")
                .isGreaterThan(created));
    }

    @Test
    @DisplayName("PAST-47 (#789) A CN holding non-ASCII characters is quoted")
    void nonAsciiCommonNamesAreQuoted(Page page, E2EUser organizer, E2EUserFactory users,
                                      CalendarProbe probe) {
        E2EUser guest = users.newUser("accented", "Benjamin André");
        CalendarPage calendar = LoginPage.loginAs(page, organizer);

        String title = title("Accents");
        calendar.createEvent().title(title).addGuest(guest.email()).save();
        awaitAttached(calendar.eventCard(title));

        String attendee = java.util.Arrays.stream(Ics.unfold(probe.singleEvent(organizer)).split("\r?\n"))
            .filter(line -> line.startsWith("ATTENDEE") && line.contains(guest.email()))
            .findFirst()
            .orElseThrow();
        if (attendee.contains("CN=") && attendee.matches(".*CN=[^;:]*[^\\p{ASCII}].*")) {
            assertThat(attendee)
                .as("many parsers drop the whole parameter list on an unquoted non-ASCII CN")
                .containsPattern("CN=\"[^\"]*\"");
        }
    }

    @Test
    @DisplayName("PAST-49 (#894) A generated video conference link carries a single slash")
    void theVideoConferenceLinkHasNoDoubleSlash(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Visio");

        calendar.createEvent().title(title).addVideoConference().save();
        awaitAttached(calendar.eventCard(title));

        String ical = probe.singleEvent(user);
        assertThat(ical).contains("meet.e2e.local");
        assertThat(ical.replaceAll("\r?\n[ \t]", ""))
            .as("the base URL and the meeting code must be joined by exactly one slash")
            .doesNotContain("meet.e2e.local//");
    }
}
