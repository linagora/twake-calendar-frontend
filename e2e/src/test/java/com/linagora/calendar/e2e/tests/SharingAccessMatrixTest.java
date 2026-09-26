package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.Arrays;
import java.util.UUID;
import java.util.stream.Stream;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe.PublicRight;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.E2EUserFactory;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.pages.CalendarModal;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.EventPreviewPopover;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.SharedCalendar;
import com.microsoft.playwright.Page;

/**
 * What each right a calendar can be lent with lets its grantee do, whatever the owner lets the
 * rest of the domain do with it.
 *
 * <p>Every right is crossed with every public right of the owner's calendar: a grantee who only
 * sees the events because the calendar happens to be public would pass on a public calendar and
 * fail on a private one, and a share only readable through the owner's node would pass on a
 * lenient server. The cells check both.
 */
class SharingAccessMatrixTest extends TwakeCalendarE2ETest {
    private static final String OWN_CALENDAR = "My calendar";
    private static final long PROPAGATION_MS = SharedCalendar.PROPAGATION_MS;

    private E2EUserFactory users;
    private E2ESessions sessions;
    private CalendarProbe probe;

    @BeforeEach
    void fixtures(E2EUserFactory users, E2ESessions sessions, CalendarProbe probe) {
        this.users = users;
        this.sessions = sessions;
        this.probe = probe;
    }

    /** The three rights the Access tab offers. */
    enum Grant {
        VIEW_ALL_EVENTS("View all events", false),
        EDITOR("Editor", true),
        ADMINISTRATOR("Administrator", true);

        private final String label;
        private final boolean writes;

        Grant(String label, boolean writes) {
            this.label = label;
            this.writes = writes;
        }

        @Override
        public String toString() {
            return label;
        }
    }

    static Stream<Arguments> cells() {
        return Arrays.stream(Grant.values())
            .flatMap(grant -> Arrays.stream(PublicRight.values())
                .map(visibility -> Arguments.of(grant, visibility)));
    }

    private static String uniqueTitle(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    @ParameterizedTest(name = "SHARE-29 \"{0}\" on a calendar whose public right is {1}: "
        + "the grantee sees the owner's events and may do what the right says, no more")
    @MethodSource("cells")
    void theGranteeGetsWhatTheRightSays(Grant grant, PublicRight visibility,
                                        Page page, E2EUser user) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Owner meeting");
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid,
            Ical.eventOrganisedBy(uid, title, E2EClock.today(), 10, user.email()));
        CalendarModal modal = calendar.modifyCalendar(OWN_CALENDAR).tab("Access");
        modal.grantAccess(mate.email(), grant.label);
        modal.save();
        // after the share: saving the Access tab writes the visibility too
        probe.setPublicRight(user, visibility);
        // free-busy stays public whatever the public right: it is the events that are not
        if (visibility == PublicRight.NONE) {
            assertThat(probe.publicPrivileges(user))
                .as("a private calendar lets the other users of the instance read no event")
                .doesNotContain("{DAV:}read", "{DAV:}write", "{DAV:}all");
        } else {
            assertThat(probe.publicPrivileges(user)).contains(visibility.privilege());
        }

        SharedCalendar shared = new SharedCalendar(matePage, user)
            .watchRequestsToOwnerNode(probe.requireOpenPaasId(user));
        shared.awaitEvent(title);
        CalendarPage mateCalendar = new CalendarPage(matePage);
        EventPreviewPopover preview = mateCalendar.openEvent(title);
        assertThat(preview.text()).contains(title);
        // a fresh page rather than dismissing the preview: the gestures below need nothing on top
        matePage.reload();
        mateCalendar.waitUntilLoaded();
        shared.show();
        mateCalendar.eventCard(title).first().waitFor();

        if (grant.writes) {
            assertWritesReachTheOwner(mateCalendar, user, title);
        } else {
            assertNothingCanBeWritten(mateCalendar, user, title);
        }

        assertThat(shared.requestsToOwnerNode())
            .as("a share grants nothing on the owner's own node: the grantee has to go through "
                + "their own instance of the calendar")
            .isEmpty();
    }

    private void assertWritesReachTheOwner(CalendarPage mateCalendar, E2EUser owner,
                                           String ownerTitle) {
        String created = uniqueTitle("Written by the delegate");
        mateCalendar.createEvent().title(created).expand().calendar(owner.uid()).save();
        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(probe.eventSummaries(owner))
                .as("what the delegate wrote belongs in the owner's calendar")
                .contains(created));

        String renamed = uniqueTitle("Renamed by the delegate");
        mateCalendar.openEvent(ownerTitle).edit().title(renamed).save();
        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(probe.eventSummaries(owner))
                .as("an edit of the delegate lands on the owner's event itself")
                .contains(renamed)
                .doesNotContain(ownerTitle));
    }

    private void assertNothingCanBeWritten(CalendarPage mateCalendar, E2EUser owner,
                                           String ownerTitle) {
        EventFormModal form = mateCalendar.createEvent().expand();
        assertThat(form.calendarOptions())
            .as("a calendar the user may only read is no destination for a new event")
            .noneMatch(option -> option.contains(owner.uid()));
        // dismissing the option list takes the form with it on this build: start from a fresh page
        mateCalendar.page().reload();
        mateCalendar.waitUntilLoaded();
        mateCalendar.eventCard(ownerTitle).first().waitFor();

        String before = probe.dtStart(owner, ownerTitle).orElseThrow();
        boolean moved = mateCalendar.tryDragEventToSlot(ownerTitle, E2EClock.today(), "18:00:00");
        assertThat(moved)
            .as("an event the user may only read is not theirs to move")
            .isFalse();
        assertThat(probe.dtStart(owner, ownerTitle)).contains(before);
    }
}
