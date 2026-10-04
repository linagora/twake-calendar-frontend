package com.linagora.calendar.e2e.tests;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import java.util.concurrent.atomic.AtomicBoolean;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Route;

class AuthenticationTest extends TwakeCalendarE2ETest {

    @Test
    @DisplayName("AUTH-01 An unauthenticated visitor is sent to the SSO and lands on their calendar")
    void loginLandsOnTheCalendar(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        assertThat(page).hasURL(java.util.regex.Pattern.compile(".*/calendar.*"));
        assertThat(page.getByLabel("Create a new event")).isVisible();
        org.assertj.core.api.Assertions.assertThat(calendar.loggedInUser()).contains(user.email());
    }

    @Test
    @DisplayName("AUTH-02 Reloading the page keeps the session, signing back in silently through the SSO")
    void reloadKeepsTheSession(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        new CalendarPage(page).reload();

        assertThat(page).hasURL(java.util.regex.Pattern.compile(".*/calendar.*"));
        assertThat(page.getByLabel("Create a new event")).isVisible();
    }

    @Test
    @DisplayName("AUTH-04 The user menu shows the email address of the signed in account")
    void theUserMenuShowsTheEmail(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        org.assertj.core.api.Assertions.assertThat(calendar.loggedInUser()).contains(user.email());
    }

    @Test
    @DisplayName("AUTH-05 The menubar avatar carries the initials of the signed in account")
    void theAvatarCarriesTheInitials(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        String initials = page.getByLabel("User profile").innerText().trim();
        org.assertj.core.api.Assertions.assertThat(initials)
            .as("the avatar of %s reads %s", user.displayName(), initials)
            .isNotEmpty()
            .containsIgnoringCase(user.displayName().substring(0, 1));
    }

    @Test
    @DisplayName("AUTH-06 Invalid credentials leave the user on the SSO form with an error")
    void invalidCredentialsStayOnTheForm(Page page, E2EUser user) {
        page.navigate("/");
        LoginPage login = new LoginPage(page).waitUntilDisplayed();

        login.fill(user.email(), "not-the-password");
        login.submit();

        assertThat(login.loginField()).isVisible();
        assertThat(page).hasURL(java.util.regex.Pattern.compile(".*/auth.*"));
        org.assertj.core.api.Assertions.assertThat(page.locator("body").innerText())
            .containsIgnoringCase("invalid");
    }

    @Test
    @DisplayName("AUTH-08 The default personal calendar is provisioned on the first login")
    void theDefaultCalendarIsProvisionedOnFirstLogin(Page page, E2EUser user,
                                                     com.linagora.calendar.e2e.backend.CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        assertThat(calendar.calendarCheckbox("My calendar")).isVisible();
        org.assertj.core.api.Assertions.assertThat(probe.openPaasId(user))
            .as("the account is created in OpenPaaS on its first authenticated call")
            .isPresent();
        // the calendar collection answers, which is what provisioning means on the DAV side
        org.assertj.core.api.Assertions.assertThat(probe.eventSummaries(user)).isEmpty();
    }

    @Test
    @DisplayName("AUTH-09 Opening /calendar without a session goes through the SSO and comes back")
    void openingCalendarWithoutASessionComesBack(Page page, E2EUser user) {
        page.navigate("/calendar");

        new LoginPage(page).submit(user);

        assertThat(page).hasURL(java.util.regex.Pattern.compile(".*/calendar.*"));
        assertThat(page.getByLabel("Create a new event")).isVisible();
    }

    @Test
    @DisplayName("AUTH-10 An expired token re-authenticates without losing the current view")
    void anExpiredTokenReAuthenticatesSilently(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.switchView("Month");
        assertThat(page).hasURL(java.util.regex.Pattern.compile(".*/calendar.*"));

        // the SSO session is still valid, only the token the SPA holds is not: the backend
        // refuses it once
        AtomicBoolean refused = new AtomicBoolean();
        page.route("http://api/**", route -> {
            if (route.request().headers().containsKey("authorization") && refused.compareAndSet(false, true)) {
                route.fulfill(new Route.FulfillOptions().setStatus(401).setBody(""));
            } else {
                route.resume();
            }
        });
        page.waitForRequest(request -> request.url().contains("/callback"), calendar::refresh);

        new CalendarPage(page).waitUntilLoaded();
        assertThat(page).hasURL(java.util.regex.Pattern.compile(".*/calendar.*"));
        assertThat(page.getByLabel("Create a new event")).isVisible();
    }

    @Test
    @DisplayName("AUTH-03 Logging out hands the session over to the SSO end session endpoint")
    void logoutHandsOverToTheSso(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.logout();

        // The SPA leaves for the provider's end session endpoint, carrying the post logout
        // redirect it was configured with. Whether the provider then drops the session is its
        // own business -- Dex, for one, wants an id_token_hint the SPA does not send today.
        java.util.regex.Pattern endSession = java.util.regex.Pattern.compile(
            "https://sso:5554/.*post_logout_redirect_uri.*");
        if (!reaches(page, endSession)) {
            // the logout discovers the SSO, then redirects to it: Chromium drops the requests in
            // flight whenever a container starts on the CI agent, see LoginPage. Not what this
            // test is about: sign in and out again. The SSO may still hold the session.
            System.out.println("[e2e] the logout did not reach the SSO, logging in and out again");
            page.navigate("/");
            page.waitForURL(url -> url.contains("/auth") || url.contains("/calendar"));
            calendar = page.url().contains("/auth")
                ? new LoginPage(page).submit(user)
                : new CalendarPage(page).waitUntilLoaded();
            calendar.logout();
            page.waitForURL(endSession);
        }
        org.assertj.core.api.Assertions.assertThat(page.url())
            .contains("client_id=twake-calendar")
            .contains("post_logout_redirect_uri");
    }

    private static boolean reaches(Page page, java.util.regex.Pattern url) {
        try {
            page.waitForURL(url, new Page.WaitForURLOptions().setTimeout(15_000));
            return true;
        } catch (com.microsoft.playwright.TimeoutError notThereYet) {
            return false;
        }
    }

    @Test
    @DisplayName("AUTH-11 Logging out ends the session in the other tabs of the application")
    void logoutEndsTheSessionInTheOtherTabs(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        Page otherTab = page.context().newPage();
        otherTab.navigate("/calendar");
        new CalendarPage(otherTab).waitUntilLoaded();

        // the other tab drops the tokens it holds in memory and starts over from the SSO
        otherTab.waitForRequest(request -> request.url().startsWith("https://sso:5554/"),
            calendar::logout);
    }
}
