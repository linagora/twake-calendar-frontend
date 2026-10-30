package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.E2EUserFactory;
import com.linagora.calendar.e2e.docker.BearerTokens;
import com.linagora.calendar.e2e.docker.BrowserLog;
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.docker.RuntimeConfig;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Frame;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/** What one account must not be able to reach, and what the page must never execute. */
class SecurityTest extends TwakeCalendarE2ETest {

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    private static String accessToken(Page page) {
        return BearerTokens.of(page);
    }

    @Test
    @DisplayName("SEC-01 A user does not see another's events without a share")
    void oneUserDoesNotSeeAnothersEvents(Page page, E2EUser user, E2EUserFactory users,
                                         E2ESessions sessions, CalendarProbe probe) {
        E2EUser other = users.newUser();
        CalendarPage theirs = sessions.openFor(other);
        CalendarPage mine = LoginPage.loginAs(page, user);
        String secret = title("Private matter");
        mine.createEvent(secret);

        theirs.reload();
        theirs.page().waitForTimeout(3000);

        PlaywrightAssertions.assertThat(theirs.eventCard(secret)).hasCount(0);
        assertThat(probe.eventSummaries(other))
            .as("nothing of mine has any business in their calendar")
            .doesNotContain(secret);
    }

    @Test
    @DisplayName("SEC-02 A token does not open another user's calendar")
    void aTokenDoesNotOpenAnothersCalendar(Page page, E2EUser user, E2EUserFactory users,
                                           E2ESessions sessions, CalendarProbe probe) {
        E2EUser other = users.newUser();
        CalendarPage theirs = sessions.openFor(other);
        // something of theirs, unmistakable if it ever comes back to me
        String theirSecret = title("Their private meeting");
        theirs.createEvent(theirSecret);
        LoginPage.loginAs(page, user);
        String theirId = probe.requireOpenPaasId(other);

        // ask for their collection, and for the events in it, carrying my own token
        Object leaked = page.evaluate(
            "async ({ token, id }) => {"
            + " const paths = ['/dav/calendars/' + id,"
            + "                '/dav/calendars/' + id + '/' + id];"
            + " const bodies = [];"
            + " for (const path of paths) {"
            + "   const response = await fetch('http://api' + path,"
            + "     { headers: { Authorization: 'Bearer ' + token } });"
            + "   bodies.push(await response.text()); }"
            + " return bodies.join('\\n'); }",
            java.util.Map.of("token", accessToken(page), "id", theirId));

        assertThat(String.valueOf(leaked))
            .as("my token must never bring back what belongs to somebody else")
            .doesNotContain(theirSecret);
    }

    @Test
    @DisplayName("SEC-04 The access token never travels in a URL")
    void theTokenNeverTravelsInAUrl(Page page, E2EUser user) {
        List<String> visited = new ArrayList<>();
        page.onFrameNavigated(frame -> visited.add(frame.url()));

        LoginPage.loginAs(page, user);

        String token = accessToken(page);
        assertThat(token).isNotEmpty();
        assertThat(visited)
            .as("a token in a URL ends up in browser history, referrers and server logs")
            .isNotEmpty()
            .allSatisfy(url -> assertThat(url).doesNotContain(token));
    }

    @Test
    @DisplayName("SEC-13 The session tokens are never written to web storage")
    void theTokensStayOutOfWebStorage(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        String token = accessToken(page);
        assertThat(token).isNotEmpty();
        Object stored = page.evaluate(
            "() => JSON.stringify({ ...sessionStorage }) + JSON.stringify({ ...localStorage })");
        assertThat(String.valueOf(stored))
            .as("web storage is readable by any script of the page, an XSS would take the tokens along")
            .doesNotContain(token)
            .doesNotContain("access_token")
            .doesNotContain("id_token");
    }

    @Test
    @DisplayName("SEC-14 The printed schedule cannot reach the application")
    void thePrintedScheduleIsSandboxed(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Printed");
        calendar.createEvent().title(title).expand().save();
        awaitAttached(calendar.eventCard(title));

        Frame printed = calendar.printCalendar("My calendar").layout("Schedule").thisWeek().print();

        assertThat(printed.locator("body").innerText()).contains(title);
        assertThat(printed.evaluate("() => window.origin"))
            .as("the schedule, written by other people, must not run with the application's origin")
            .isEqualTo("null");
        assertThat(printed.evaluate(
            "() => { try { return window.parent.document.title; } catch (e) { return 'blocked'; } }"))
            .as("nor reach the window it is printed from")
            .isEqualTo("blocked");
    }

    @Test
    @DisplayName("SEC-15 Loading the application fetches nothing from a public CDN")
    void nothingIsFetchedFromAPublicCdn(Page page, E2EUser user) {
        List<String> requested = new ArrayList<>();
        page.onRequest(request -> requested.add(request.url()));

        LoginPage.loginAs(page, user);
        new CalendarPage(page).reload();

        assertThat(requested)
            .as("a third party would learn about every loading screen, and serve code nobody reviewed")
            .isNotEmpty()
            .noneMatch(url -> url.contains("cdn.jsdelivr.net") || url.contains("unpkg.com"));
        assertThat(requested).anyMatch(url -> url.endsWith("/dotlottie-player.wasm"));
    }

    @Test
    @DisplayName("SEC-06 A script in a description is never executed")
    void aScriptInADescriptionIsNeverExecuted(Page page, E2EUser user, BrowserLog log) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Injected description");

        calendar.createEvent().title(title).expand()
            .description("<img src=x onerror=\"window.__executed = true\">"
                + "<script>window.__executed = true</script>")
            .save();
        awaitAttached(calendar.eventCard(title));
        calendar.openEvent(title).showMore();
        page.waitForTimeout(2000);

        assertThat(page.evaluate("() => window.__executed === true"))
            .as("a description is text, never code")
            .isEqualTo(Boolean.FALSE);
        assertThat(log.pageErrors()).isEmpty();
    }

    @Test
    @DisplayName("SEC-07 A script in a title is never executed")
    void aScriptInATitleIsNeverExecuted(Page page, E2EUser user, BrowserLog log) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String marker = UUID.randomUUID().toString().substring(0, 8);
        String title = "<img src=x onerror=\"window.__executed = true\"> " + marker;

        calendar.createEvent().title(title).save();
        page.waitForTimeout(3000);

        assertThat(page.evaluate("() => window.__executed === true"))
            .as("a title is text, never code")
            .isEqualTo(Boolean.FALSE);
        assertThat(page.locator("body").innerText())
            .as("and it is shown as the user typed it")
            .contains(marker);
        assertThat(log.pageErrors()).isEmpty();
    }

    @Test
    @DisplayName("SEC-08 A link in a description opens without handing over the opener")
    void aLinkInADescriptionIsSafe(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("With a link");

        calendar.createEvent().title(title).expand()
            .description("Agenda here: https://example.com/agenda")
            .save();
        awaitAttached(calendar.eventCard(title));
        calendar.openEvent(title).showMore();
        page.waitForTimeout(1500);

        Object unsafe = page.evaluate(
            "() => Array.from(document.querySelectorAll('a[href^=\"https://example.com\"]'))"
            + ".filter(a => a.target === '_blank' && !(a.rel || '').includes('noopener')).length");
        assertThat(((Number) unsafe).intValue())
            .as("a page opened in a new tab must not keep a handle on ours")
            .isZero();
    }

    @Test
    @DisplayName("SEC-09 DISABLE_PUBLIC_VISIBILITY takes the public option away")
    void publicVisibilityCanBeDisabled(Page page, E2EUser user, RuntimeConfig config) {
        config.set("DISABLE_PUBLIC_VISIBILITY", "true");
        CalendarPage calendar = LoginPage.loginAs(page, user);

        var form = calendar.createEvent().title(title("Restricted")).expand();

        assertThat(form.text())
            .as("a deployment that forbids public events must not offer the choice")
            .doesNotContain("Visible to");
    }

    @Test
    @DisplayName("SEC-12 A websocket ticket cannot be spent twice")
    void aTicketCannotBeSpentTwice(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        Object ticket = page.evaluate(
            "async (token) => {"
            + " const response = await fetch('http://api/ws/ticket',"
            + "   { method: 'POST', headers: { Authorization: 'Bearer ' + token } });"
            + " if (!response.ok) return null;"
            + " const body = await response.json();"
            + " return body.value || body.ticket || null; }", accessToken(page));
        assertThat(ticket).as("the ticket endpoint must answer a signed in user").isNotNull();

        String open = "(t) => new Promise(resolve => {"
            + " const socket = new WebSocket('ws://api/ws?ticket=' + encodeURIComponent(t));"
            + " const done = value => { try { socket.close(); } catch (e) { } resolve(value); };"
            + " socket.onopen = () => done(true);"
            + " socket.onerror = () => done(false);"
            + " socket.onclose = () => done(false);"
            + " setTimeout(() => done(false), 8000); })";
        assertThat(page.evaluate(open, ticket))
            .as("the ticket is good once")
            .isEqualTo(Boolean.TRUE);

        assertThat(page.evaluate(open, ticket))
            .as("a ticket already spent is not a standing key to the event stream")
            .isEqualTo(Boolean.FALSE);
    }
}
