package com.linagora.calendar.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.AriaRole;

/** The settings panel, reachable from the user menu. */
public class SettingsPage {
    private final Page page;

    public SettingsPage(Page page) {
        this.page = page;
    }

    SettingsPage waitUntilOpen() {
        languageSelector().waitFor();
        awaitUserConfigurationLoaded();
        return this;
    }

    /**
     * The grid shows up before the user configuration is fetched. A setting changed in between
     * is overwritten by the backend defaults once they land: the language flips back to English,
     * the timezone to the deployment one. The configuration load is the only thing that writes
     * the timezone into a fresh local storage, so its presence tells the load is over.
     */
    private void awaitUserConfigurationLoaded() {
        page.waitForFunction("() => localStorage.getItem('timeZone') !== null");
    }

    /**
     * The language picker. Its own accessible name is translated along with everything else, so
     * it is located by shape once the English label is gone.
     */
    private Locator languageSelector() {
        Locator english = page.getByLabel("Language selector");
        if (english.count() > 0) {
            return english.first();
        }
        return page.getByRole(AriaRole.COMBOBOX).first();
    }

    /** One of English, Français, Русский, Tiếng Việt. */
    public SettingsPage selectLanguage(String language) {
        languageSelector().click();
        awaitPersisted(() -> page.getByRole(AriaRole.OPTION,
            new Page.GetByRoleOptions().setName(language).setExact(true)).click());
        return this;
    }

    /**
     * Pins the application timezone. Automatic detection has to go first, otherwise the
     * browser timezone wins straight back. Turning it off only reveals the picker: nothing is
     * written until a zone is chosen, so there is no request to wait for.
     */
    public SettingsPage selectTimezone(String timezone) {
        Locator autoDetect = page.getByLabel("Detect time zone automatically").first();
        if (autoDetect.isChecked()) {
            autoDetect.click();
            com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat(autoDetect).not().isChecked();
        }
        Locator picker = page.getByPlaceholder("Select timezone");
        if (isSelected(picker, timezone)) {
            // picking the zone already shown changes nothing, hence writes nothing
            return this;
        }
        for (int attempt = 1; attempt <= 3; attempt++) {
            picker.click();
            picker.fill("");
            picker.pressSequentially(timezone, new Locator.PressSequentiallyOptions().setDelay(40));
            // wait for the option that matches what was typed, never for whichever one happens
            // to be first: the list answers keystroke by keystroke, and one that has not caught
            // up still offers every zone on earth
            Locator wanted = page.locator("li[role=option]")
                .filter(new Locator.FilterOptions().setHasText(timezone));
            try {
                wanted.first().waitFor(new Locator.WaitForOptions().setTimeout(15_000));
            } catch (com.microsoft.playwright.TimeoutError notFilteredYet) {
                continue;
            }
            awaitPersisted(() -> wanted.first().click());
            return this;
        }
        throw new AssertionError("The settings timezone list never settled on " + timezone);
    }

    /** The picker reads "Asia/Tokyo (UTC+9)", underscores turned into spaces. */
    private static boolean isSelected(Locator picker, String timezone) {
        return picker.inputValue().startsWith(timezone.replace('_', ' ') + " (");
    }

    /** One of the settings tabs: Settings, Notifications. */
    public SettingsPage tab(String tab) {
        Locator target = page.getByRole(AriaRole.TAB, new Page.GetByRoleOptions().setName(tab));
        target.click();
        com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat(target)
            .hasAttribute("aria-selected", "true");
        return this;
    }

    /** Toggles one of the working day buttons, by its iCalendar code. */
    public SettingsPage workingDay(String icalDay) {
        awaitPersisted(() -> page.getByLabel(icalDay, new Page.GetByLabelOptions().setExact(true))
            .first().click());
        return this;
    }

    /** Flips one of the switches, designated by its visible label. */
    public SettingsPage toggle(String label) {
        awaitPersisted(() -> page.getByLabel(label).first().click());
        return this;
    }

    /**
     * Flips one of the switches kept in the browser only, which therefore never reaches the
     * server and has no write to wait for.
     */
    public SettingsPage toggleInBrowser(String label) {
        Locator toggle = page.getByLabel(label).first();
        boolean wasChecked = toggle.isChecked();
        toggle.click();
        PlaywrightAssertions.assertThat(toggle)
            .isChecked(new LocatorAssertions.IsCheckedOptions().setChecked(!wasChecked));
        return this;
    }

    public boolean isChecked(String label) {
        return page.getByLabel(label).first().isChecked();
    }

    /**
     * Settings are relabelled in the store before the server knows about it. Waiting for the
     * write to come back keeps a following reload from racing it.
     */
    private void awaitPersisted(Runnable action) {
        page.waitForResponse(
            response -> response.url().contains("api/configurations")
                && "PATCH".equals(response.request().method()),
            action::run);
    }

    public CalendarPage backToCalendar() {
        page.getByLabel("Back to calendar").click();
        return new CalendarPage(page).waitUntilLoaded();
    }
}
