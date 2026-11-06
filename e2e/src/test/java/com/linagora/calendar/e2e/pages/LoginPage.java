package com.linagora.calendar.e2e.pages;

import com.linagora.calendar.e2e.backend.E2EUser;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.TimeoutError;
import com.microsoft.playwright.options.WaitUntilState;

/** The Dex login form the SPA redirects to when no session is present. */
public class LoginPage {
    private final Page page;

    public LoginPage(Page page) {
        this.page = page;
    }

    /** Goes through the whole OIDC dance and returns once the calendar is usable. */
    public static CalendarPage loginAs(Page page, E2EUser user) {
        LoginPage login = new LoginPage(page);
        login.openCalendar();
        return login.submit(user);
    }

    public CalendarPage submit(E2EUser user) {
        waitUntilDisplayed();
        fill(user.email(), user.password());
        submit();
        if (!landsOnTheCalendar()) {
            // A dropped token exchange can land on /error or leave the callback stalled.
            // Restart once from the app, using the Dex session if it was already established.
            System.out.println("[e2e] the OIDC callback did not reach the calendar, logging in again");
            openCalendar();
            page.waitForURL(url -> url.contains("/auth") || url.contains("/calendar"),
                new Page.WaitForURLOptions().setWaitUntil(WaitUntilState.COMMIT));
            if (page.url().contains("/auth")) {
                loginField().waitFor();
                fill(user.email(), user.password());
                submit();
            }
        }
        CalendarPage calendar = new CalendarPage(page).waitUntilLoaded();
        // the SPA took its date as it started, on the callback, which runs on the real clock:
        // see E2EClock. Start it over from the root rather than reloading the calendar: the tokens
        // live in the memory of the page, and a reloaded calendar would draw itself -- and fire
        // its requests, answered by 401 -- before signing back in through the SSO.
        CalendarPage.signInAgain(page, this::openCalendar);
        calendar.waitUntilLoaded();
        return calendar;
    }

    private void openCalendar() {
        // The next step waits for the specific page it needs; a page load is not a login signal.
        page.navigate("/", new Page.NavigateOptions().setWaitUntil(WaitUntilState.COMMIT));
    }

    private boolean landsOnTheCalendar() {
        try {
            page.waitForURL(url -> url.contains("/calendar") || url.contains("/error"),
                new Page.WaitForURLOptions().setWaitUntil(WaitUntilState.COMMIT));
            return !page.url().contains("/error");
        } catch (TimeoutError callbackStalled) {
            return false;
        }
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
        if (!reachesTheSso()) {
            // the SPA discovers the SSO, then redirects to it: when Chromium drops either request
            // -- see submit -- the page stays blank, or on an error page. Start the SPA over, on
            // the address it was given.
            System.out.println("[e2e] the SPA did not reach the SSO, reloading it");
            page.reload(new Page.ReloadOptions()
                .setWaitUntil(WaitUntilState.COMMIT));
            page.waitForURL("**/auth**");
        }
        loginField().waitFor();
        return this;
    }

    private boolean reachesTheSso() {
        try {
            page.waitForURL("**/auth**", new Page.WaitForURLOptions().setTimeout(15_000));
            return true;
        } catch (TimeoutError notThereYet) {
            return false;
        }
    }

    public Locator loginField() {
        return page.locator("input[name='login']");
    }
}
