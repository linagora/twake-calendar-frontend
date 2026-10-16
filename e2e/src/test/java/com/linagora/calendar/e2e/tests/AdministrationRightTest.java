package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.E2EUserFactory;
import com.linagora.calendar.e2e.backend.ResourceProbe;
import com.linagora.calendar.e2e.backend.TeamCalendarProbe;
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.pages.CalendarModal;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.SharedCalendar;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.PlaywrightAssertions;

/**
 * Somebody holding the administration right on a calendar that is not theirs manages it exactly
 * as its owner would: who else may use it, from the Access tab of the calendar dialog, and who
 * may read it, from its public visibility.
 *
 * <p>One scenario per kind of calendar that can be administered by somebody else: a team
 * calendar, the calendar of another user, a resource. Each one gets there by a road of its own
 * -- a team membership, a share, the administrators of the resource -- and each one saves through
 * a calendar node that is not the administrator's own.
 */
class AdministrationRightTest extends TwakeCalendarE2ETest {
    private static final long PROPAGATION_MS = SharedCalendar.PROPAGATION_MS;

    private E2EUserFactory users;
    private E2ESessions sessions;
    private CalendarProbe probe;
    private TeamCalendarProbe teams;
    private ResourceProbe resources;

    @BeforeEach
    void sessions(E2EUserFactory users, E2ESessions sessions) {
        this.users = users;
        this.sessions = sessions;
    }

    @BeforeEach
    void probes(CalendarProbe probe, TeamCalendarProbe teams, ResourceProbe resources) {
        this.probe = probe;
        this.teams = teams;
        this.resources = resources;
    }

    /** The sidebar row of a calendar, in one session: the one whose text holds {@code fragment}. */
    private record Row(Page page, String fragment) {
        /** Reloads, slowly, until the row shows up. */
        void awaitVisible() {
            SharedCalendar.reloadUntil(page, calendar ->
                page.locator("li").filter(new Locator.FilterOptions().setHasText(fragment))
                    .first().waitFor(new Locator.WaitForOptions().setTimeout(8_000)));
        }

        /** Opens the dialog of the calendar on a fresh page. */
        CalendarModal reopenDialog() {
            return new CalendarPage(page).reload().modifyCalendarMatching(fragment);
        }
    }

    /** Somebody reading a calendar node straight from Sabre, bypassing the application. */
    private record Reader(CalendarProbe probe, E2EUser who, String node) {
        int status() {
            return probe.readStatus(who, node);
        }

        /** Waits until Sabre gives them that answer. */
        void awaitStatus(int status, String because) {
            Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
                assertThat(status()).as(because).isEqualTo(status));
        }
    }

    private static String unique(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    /** A user of the domain holding no right on the calendar, logged in once to exist. */
    private Reader aStrangerReading(String node) {
        E2EUser stranger = users.newUser("stranger");
        sessions.pageFor(stranger);
        return new Reader(probe, stranger, node);
    }

    /** A team whose calendar the given user administers, visible in their sidebar. */
    private String aTeamAdministeredBy(Page page, E2EUser administrator, String name) {
        String teamId = teams.create("team-" + UUID.randomUUID().toString().substring(0, 8), name);
        teams.grant(teamId, administrator, TeamCalendarProbe.Right.ADMINISTRATION);
        new Row(page, name).awaitVisible();
        return teamId;
    }

    /** The owner lends their calendar to somebody, from the Access tab. */
    private void lend(CalendarPage owner, E2EUser grantee, String right) {
        CalendarModal modal = owner.modifyCalendar("My calendar").tab("Access");
        modal.grantAccess(grantee.email(), right);
        modal.save();
    }

    /** Grants a right from the Access tab of the calendar of that row. */
    private void grantFromTheDialog(Row row, E2EUser grantee, String right) {
        CalendarModal modal = new CalendarPage(row.page()).modifyCalendarMatching(row.fragment())
            .tab("Access");
        assertThat(modal.canGrantAccess())
            .as("an administrator of the calendar is offered to grant rights on it")
            .isTrue();
        modal.grantAccess(grantee.email(), right);
        modal.save();
    }

    /** Reopens that dialog on a fresh page and reads back the right the grantee holds. */
    private String rightShownAfterAReload(Row row, E2EUser grantee) {
        CalendarModal modal = row.reopenDialog().tab("Access");
        String right = modal.hasAccessRow(grantee.email()) ? modal.rightOf(grantee.email()) : "";
        modal.close();
        return right;
    }

    /** Sets the public visibility of the calendar of that row, All or You, and saves. */
    private void setVisibility(Row row, String audience) {
        CalendarModal modal = row.reopenDialog();
        assertThat(modal.showsVisibility())
            .as("an administrator of the calendar manages its public visibility")
            .isTrue();
        modal.newEventsVisibleTo(audience);
        modal.save();
    }

    @Test
    @DisplayName("ADMIN-04 An administrator of a team calendar makes it public, then private "
        + "again, and the other users of the domain can read it, then no longer")
    void aTeamAdministratorManagesThePublicVisibility(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);
        String name = unique("Visible team");
        Reader stranger = aStrangerReading(
            CalendarProbe.defaultCalendarNode(aTeamAdministeredBy(page, user, name)));
        Row team = new Row(page, name);
        assertThat(stranger.status())
            .as("a team calendar starts private")
            .isEqualTo(403);

        setVisibility(team, "All");
        stranger.awaitStatus(200, "a team calendar made public is readable by the whole domain");

        setVisibility(team, "You");
        stranger.awaitStatus(403,
            "a team calendar made private again is readable by its members only");
    }

    @Test
    @DisplayName("ADMIN-05 An administrator of a resource makes it private, then public again, "
        + "and the other users of the domain can no longer read it, then can")
    void aResourceAdministratorManagesThePublicVisibility(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);
        String name = unique("Visible room");
        Reader stranger = aStrangerReading(
            CalendarProbe.defaultCalendarNode(resources.create(name, "A room", user)));
        Row room = new Row(page, name);
        room.awaitVisible();
        assertThat(stranger.status())
            .as("a resource starts public: anybody may see when it is booked")
            .isEqualTo(200);

        setVisibility(room, "You");
        stranger.awaitStatus(403, "a resource made private is readable by its administrators only");

        setVisibility(room, "All");
        stranger.awaitStatus(200, "a resource made public again is readable by the whole domain");
    }

    @Test
    @DisplayName("ADMIN-06 An administrator of somebody else's calendar makes it public, and the "
        + "other users of the domain can read it")
    void aDelegatedAdministratorManagesThePublicVisibility(Page page, E2EUser user) {
        E2EUser administrator = users.newUser("admin");
        Page administratorPage = sessions.pageFor(administrator);
        CalendarPage owner = LoginPage.loginAs(page, user);
        lend(owner, administrator, "Administrator");
        probe.setPublicRight(user, CalendarProbe.PublicRight.NONE);
        Reader stranger = aStrangerReading(
            CalendarProbe.defaultCalendarNode(probe.requireOpenPaasId(user)));
        assertThat(stranger.status()).isEqualTo(403);
        new SharedCalendar(administratorPage, user).awaitInSidebar();

        setVisibility(new Row(administratorPage, user.uid()), "All");

        stranger.awaitStatus(200,
            "the calendar its administrator made public is readable by the whole domain");
        assertThat(probe.publicPrivileges(user))
            .as("it is the owner's calendar itself that became public")
            .contains("{DAV:}read");
    }

    @ParameterizedTest(name = "ADMIN-07 A grantee holding \"{0}\" sees the public visibility of "
        + "the calendar, and cannot change it")
    @ValueSource(strings = {"View all events", "Editor"})
    void aGranteeSeesThePublicVisibilityReadOnly(String right, Page page, E2EUser user) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        lend(LoginPage.loginAs(page, user), mate, right);
        probe.setPublicRight(user, CalendarProbe.PublicRight.READ);
        new SharedCalendar(matePage, user).awaitInSidebar();
        Row borrowed = new Row(matePage, user.uid());

        CalendarModal modal = borrowed.reopenDialog();
        assertThat(modal.showsVisibility())
            .as("the grantee is told who else may see the events of the calendar")
            .isTrue();
        PlaywrightAssertions.assertThat(modal.visibilityOption("All"))
            .hasAttribute("aria-pressed", "true");
        PlaywrightAssertions.assertThat(modal.visibilityOption("All")).isDisabled();
        PlaywrightAssertions.assertThat(modal.visibilityOption("You")).isDisabled();
        modal.close();

        probe.setPublicRight(user, CalendarProbe.PublicRight.NONE);
        CalendarModal reopened = borrowed.reopenDialog();
        // what the grantee is shown follows the calendar
        PlaywrightAssertions.assertThat(reopened.visibilityOption("You"))
            .hasAttribute("aria-pressed", "true");
        reopened.close();
    }

    @Test
    @DisplayName("ADMIN-01 An administrator of a team calendar grants a right on it "
        + "from the calendar dialog")
    void aTeamAdministratorGrantsARight(Page page, E2EUser user) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        LoginPage.loginAs(page, user);
        String name = unique("Administered team");
        String teamId = aTeamAdministeredBy(page, user, name);
        Row team = new Row(page, name);

        grantFromTheDialog(team, mate, "View all events");

        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(teams.members(teamId))
                .as("the right granted from the dialog is a membership of the team")
                .contains(mate.email()));
        assertThat(rightShownAfterAReload(team, mate)).isEqualTo("View all events");
        new Row(matePage, name).awaitVisible();
    }

    @Test
    @DisplayName("ADMIN-02 An administrator of somebody else's calendar grants a right on it "
        + "from the calendar dialog")
    void aDelegatedAdministratorGrantsARight(Page page, E2EUser user) {
        E2EUser administrator = users.newUser("admin");
        E2EUser mate = users.newUser("mate");
        Page administratorPage = sessions.pageFor(administrator);
        Page matePage = sessions.pageFor(mate);
        CalendarPage owner = LoginPage.loginAs(page, user);
        lend(owner, administrator, "Administrator");
        new SharedCalendar(administratorPage, user).awaitInSidebar();

        grantFromTheDialog(new Row(administratorPage, user.uid()), mate, "View all events");

        new SharedCalendar(matePage, user).awaitInSidebar();
        CalendarModal reopened = owner.reload().modifyCalendar("My calendar").tab("Access");
        assertThat(reopened.awaitAccessRow(mate.email()))
            .as("the owner sees who their administrator let in")
            .isTrue();
        assertThat(reopened.rightOf(mate.email())).isEqualTo("View all events");
        assertThat(reopened.rightOf(administrator.email())).isEqualTo("Administrator");
        reopened.close();
    }

    @Test
    @DisplayName("ADMIN-03 An administrator of a resource grants a right on it "
        + "from the calendar dialog")
    void aResourceAdministratorGrantsARight(Page page, E2EUser user) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        LoginPage.loginAs(page, user);
        String name = unique("Administered room");
        resources.create(name, "A room", user);
        Row room = new Row(page, name);
        room.awaitVisible();

        grantFromTheDialog(room, mate, "View all events");

        assertThat(rightShownAfterAReload(room, mate)).isEqualTo("View all events");
        new Row(matePage, name).awaitVisible();
    }
}
