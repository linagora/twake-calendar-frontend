package com.linagora.calendar.e2e.docker;

import java.util.ArrayList;
import java.util.List;

import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;

/**
 * Opens additional logged in sessions, for the scenarios that need more than one person:
 * invitations, shared calendars, team calendars, resource approvals.
 *
 * <p>Each session gets its own browser context, so cookies and tokens never bleed between
 * users. They are all closed when the test ends.
 */
public class E2ESessions {
    private final Browser browser;
    private final List<BrowserContext> contexts = new ArrayList<>();

    E2ESessions(Browser browser) {
        this.browser = browser;
    }

    /** Logs the given user in, in a session of their own, and returns their calendar. */
    public CalendarPage openFor(E2EUser user) {
        return new CalendarPage(pageFor(user)).waitUntilLoaded();
    }

    /** A session whose browser sits in another timezone, to see the same data from elsewhere. */
    public CalendarPage openFor(E2EUser user, String browserTimezone) {
        BrowserContext context = browser.newContext(
            TwakeCalendarE2EExtension.contextOptions().setTimezoneId(browserTimezone));
        E2EClock.install(context);
        LiveProbe.install(context);
        contexts.add(context);
        Page page = context.newPage();
        LoginPage.loginAs(page, user);
        return new CalendarPage(page).waitUntilLoaded();
    }

    /** Same, when the test needs the raw page rather than the calendar page object. */
    public Page pageFor(E2EUser user) {
        BrowserContext context = browser.newContext(TwakeCalendarE2EExtension.contextOptions());
        context.grantPermissions(java.util.List.of("clipboard-read", "clipboard-write"));
        E2EClock.install(context);
        LiveProbe.install(context);
        contexts.add(context);
        Page page = context.newPage();
        LoginPage.loginAs(page, user);
        return page;
    }

    /**
     * A logged in session on a screen of another size, for the layouts that depend on it.
     *
     * <p>A context of its own rather than a resize of the current one: the application decides
     * its layout as it starts, and a viewport changed afterwards is a different scenario -- the
     * one {@code RESP-16} is about.
     */
    public CalendarPage openFor(E2EUser user, int width, int height) {
        BrowserContext context = browser.newContext(
            TwakeCalendarE2EExtension.contextOptions().setViewportSize(width, height));
        E2EClock.install(context);
        LiveProbe.install(context);
        contexts.add(context);
        Page page = context.newPage();
        LoginPage.loginAs(page, user);
        return new CalendarPage(page).waitUntilLoaded();
    }

    /**
     * A session that never logs in, for the pages a stranger reaches.
     *
     * <p>Its own context, so it carries none of the tokens of the test user: a public page that
     * only works because the owner happened to be signed in would pass unnoticed otherwise.
     */
    public Page blankPage() {
        BrowserContext context = browser.newContext(TwakeCalendarE2EExtension.contextOptions());
        E2EClock.install(context);
        LiveProbe.install(context);
        contexts.add(context);
        return context.newPage();
    }

    void closeAll() {
        contexts.forEach(BrowserContext::close);
        contexts.clear();
    }
}
