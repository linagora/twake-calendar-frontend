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
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.backend.Vcal;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * The footer the application appends to a description -- meeting link, attachments -- and takes
 * off again when the form opens. Whatever the stored text holds, the user must get back their own
 * text, and a save must write the same description again.
 */
class DescriptionFooterTest extends TwakeCalendarE2ETest {
    private static final Duration SAVED = Duration.ofSeconds(30);
    private static final String SEPARATOR = "-_-_-_-_-_-_-_-";
    private static final String FOOTER_NOTICE = "Please do not edit this section.";

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    private CalendarPage seed(Page page, E2EUser user, CalendarProbe probe, String title,
                              String extraLines) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String day = Vcal.day(E2EClock.today());
        probe.putEvent(user, UUID.randomUUID().toString(), Vcal.calendar("""
            BEGIN:VEVENT
            UID:%s
            DTSTAMP:20260101T000000Z
            DTSTART:%sT080000Z
            DTEND:%sT090000Z
            SUMMARY:%s
            %s
            END:VEVENT
            """.formatted(UUID.randomUUID(), day, day, title, extraLines)));
        calendar.reload();
        awaitAttached(calendar.eventCard(title));
        return calendar;
    }

    private String rename(CalendarPage calendar, E2EUser user, CalendarProbe probe, String title) {
        String renamed = title(title.split(" ")[0] + " renamed");
        EventFormModal form = calendar.openEvent(title).edit();
        form.title(renamed);
        form.save();
        Awaitility.await().atMost(SAVED).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).contains("SUMMARY:" + renamed));
        return renamed;
    }

    private String storedDescription(E2EUser user, CalendarProbe probe) {
        return Ics.property(Ics.event(probe.singleEvent(user)), "DESCRIPTION").orElse("");
    }

    @Test
    @DisplayName("FOOTER-01 (#1911) An attachment without file name is not listed as \"undefined\"")
    void anAttachmentWithoutFileNameIsNotUndefined(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Nameless");
        CalendarPage calendar = seed(page, user, probe, title, """
            DESCRIPTION:Notes
            ATTACH:https://files.example.com/shared/agenda""");

        rename(calendar, user, probe, title);

        assertThat(storedDescription(user, probe))
            .as("the description goes to every guest: no 'undefined' in it")
            .doesNotContain("undefined")
            .contains("https://files.example.com/shared/agenda");
    }

    @Test
    @DisplayName("FOOTER-02 (#1910) A lone separator in the text keeps the text after it")
    void aLoneSeparatorKeepsTheTextAfterIt(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Separated");
        CalendarPage calendar = seed(page, user, probe, title, """
            DESCRIPTION:Notes\\n%s\\nAgenda
            X-OPENPAAS-VIDEOCONFERENCE:https://meet.e2e.local/abc-def-ghi""".formatted(SEPARATOR));

        String renamed = rename(calendar, user, probe, title);

        assertThat(storedDescription(user, probe))
            .as("an ordinary save must not delete what follows the separator")
            .contains("Agenda");
        EventFormModal again = calendar.openEvent(renamed).edit();
        assertThat(again.description())
            .as("the user gets their own text back, not the footer")
            .contains("Notes").contains("Agenda").doesNotContain(FOOTER_NOTICE);
        again.cancel();
    }

    @Test
    @DisplayName("FOOTER-03 (#1912) A file name holding the separator does not leak the footer into the form")
    void aSeparatorInAFileNameStaysInTheFooter(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Crafted");
        CalendarPage calendar = seed(page, user, probe, title, """
            DESCRIPTION:Notes
            ATTACH;X-FILENAME=%s.pdf:https://files.example.com/shared/crafted"""
            .formatted(SEPARATOR));

        String renamed = rename(calendar, user, probe, title);
        String firstSave = storedDescription(user, probe);

        EventFormModal again = calendar.openEvent(renamed).edit();
        assertThat(again.description())
            .as("the footer written for that attachment comes off whole")
            .isEqualTo("Notes");
        String second = title("Crafted again");
        again.title(second);
        again.save();
        Awaitility.await().atMost(SAVED).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).contains("SUMMARY:" + second));

        assertThat(storedDescription(user, probe))
            .as("an unchanged description is written the same way again")
            .isEqualTo(firstSave);
    }
}
