package com.linagora.calendar.e2e.pages;

import com.linagora.calendar.e2e.backend.E2EUser;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

/** The Dex login form the SPA redirects to when no session is present. */
public class LoginPage {
    private final Page page;

    public LoginPage(Page page) {
        this.page = page;
    }

    /** Goes through the whole OIDC dance and returns once the calendar is usable. */
    public static CalendarPage loginAs(Page page, E2EUser user) {
        page.navigate("/");
        return new LoginPage(page).submit(user);
    }

    public CalendarPage submit(E2EUser user) {
        waitUntilDisplayed();
        fill(user.email(), user.password());
        submit();
        if (!landsOnTheCalendar()) {
            // the token exchange of the callback is a single request, and Chromium drops the
            // requests in flight whenever a network interface of the host comes or goes -- any
            // container started on a shared CI agent. Not what a login test is about: go again.
            System.out.println("[e2e] the OIDC callback failed, logging in again");
            page.navigate("/");
            page.waitForURL(url -> url.contains("/auth") || url.contains("/calendar"));
            if (page.url().contains("/auth")) {
                loginField().waitFor();
                fill(user.email(), user.password());
                submit();
            }
        }
        CalendarPage calendar = new CalendarPage(page).waitUntilLoaded();
        // the SPA took its date as it started, on the callback, which runs on the real clock:
        // see E2EClock
        page.reload();
        calendar.waitUntilLoaded();
        return calendar;
    }

    private boolean landsOnTheCalendar() {
        page.waitForURL(url -> url.contains("/calendar") || url.contains("/error"));
        return !page.url().contains("/error");
    }

    /** Fills the form without submitting it, for the tests that assert on what it does next. */
    public LoginPage fill(String login, String password) {
        page.locator("input[name='login']").fill(login);
        page.locator("input[name='password']").fill(password);
        return this;
    }

    public void submit() {
        page.locator("button[type='submit']").click();
    }

    public LoginPage waitUntilDisplayed() {
        page.waitForURL("**/auth**");
        loginField().waitFor();
        return this;
    }

    public Locator loginField() {
        return page.locator("input[name='login']");
    }
}
