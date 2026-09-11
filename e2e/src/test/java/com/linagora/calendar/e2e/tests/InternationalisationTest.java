package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.docker.RuntimeConfig;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.RecurrenceSection;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/** Speaking the user's language, everywhere and not only in the menus. */
class InternationalisationTest extends TwakeCalendarE2ETest {

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    /**
     * The page objects speak English, by design: they name what the interface names. Once the
     * language changes, a test has to address the interface in that language, which is the whole
     * point of these tests.
     */
    private static final String FR_CREATE = "Créer un nouvel événement";
    private static final String FR_REFRESH = "Actualiser";

    /** Switches the interface language and comes back to the calendar. */
    private CalendarPage speaking(CalendarPage calendar, String language) {
        calendar.openSettings().selectLanguage(language);
        calendar.page().reload();
        return calendar.waitUntilLoaded();
    }

    @Test
    @DisplayName("I18N-01 Russian relabels the menubar and the sidebar")
    void russianRelabelsTheInterface(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        speaking(calendar, "Русский");

        PlaywrightAssertions.assertThat(page.getByLabel("Сегодня", new Page.GetByLabelOptions().setExact(true)))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        assertThat(page.locator("body").innerText()).contains("Личные");
    }

    @Test
    @DisplayName("I18N-02 Vietnamese relabels the menubar and the sidebar")
    void vietnameseRelabelsTheInterface(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        speaking(calendar, "Tiếng Việt");

        PlaywrightAssertions.assertThat(page.getByLabel("Hôm nay", new Page.GetByLabelOptions().setExact(true)))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        assertThat(page.locator("body").innerText()).contains("Lịch cá nhân");
    }

    @Test
    @DisplayName("I18N-03 The month names of the grid follow the chosen language")
    void theMonthNamesFollowTheLanguage(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String english = calendar.periodTitle();

        speaking(calendar, "Français");

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(calendar.periodTitle())
                .as("the period was %s in English", english)
                .containsPattern("(?i)(janvier|février|mars|avril|mai|juin|juillet|"
                    + "ao[uû]t|septembre|octobre|novembre|décembre)"));
    }

    @Test
    @DisplayName("I18N-04 The day names of the grid follow the chosen language")
    void theDayNamesFollowTheLanguage(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        speaking(calendar, "Français");

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(String.join(" ", calendar.visibleDayHeaders()).toLowerCase())
                .containsPattern("lun|mar|mer|jeu|ven|sam|dim"));
    }

    @Test
    @DisplayName("I18N-05 The mini calendar weekday letters follow the locale")
    void theWeekdayLettersFollowTheLocale(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        List<String> english = miniCalendarWeekdays(page);
        assertThat(english).isNotEmpty();

        speaking(calendar, "Français");

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(miniCalendarWeekdays(page))
                .as("English reads %s", english)
                .isNotEqualTo(english));
    }

    @SuppressWarnings("unchecked")
    private static List<String> miniCalendarWeekdays(Page page) {
        return (List<String>) page.evaluate(
            "() => Array.from(document.querySelectorAll('.MuiDayCalendar-weekDayLabel'))"
            + ".map(e => e.innerText.trim())");
    }

    @Test
    @DisplayName("I18N-06 Times are shown on a 24 hour clock")
    void timesUseThe24HourClock(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Afternoon");

        calendar.createEvent().title(title).expand().startTime("14:00").endTime("15:00").save();
        awaitAttached(calendar.eventCard(title));

        assertThat(calendar.eventCard(title).first().innerText())
            .as("the deployment is configured for a 24 hour clock")
            .contains("14:00")
            .doesNotContain("PM");
    }

    @Test
    @DisplayName("I18N-07 The long date format of the form follows the locale")
    void theLongDateFormatFollowsTheLocale(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        var english = calendar.createEvent().expand().startDate();
        page.getByRole(com.microsoft.playwright.options.AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName("Cancel").setExact(true)).last().click();
        page.waitForTimeout(1000);

        speaking(calendar, "Français");

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            page.getByLabel(FR_CREATE).click();
            page.getByLabel("Titre").first().waitFor();
            page.getByLabel("expand").click();
            assertThat(page.getByTestId("start-date-input").inputValue())
                .as("English read %s", english)
                .isNotEqualTo(english)
                .containsPattern("(?i)(janvier|février|mars|avril|mai|juin|juillet|"
                    + "ao[uû]t|septembre|octobre|novembre|décembre)");
        });
    }

    @Test
    @DisplayName("I18N-08 Validation messages are translated")
    void validationMessagesAreTranslated(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        speaking(calendar, "Français");

        page.getByLabel(FR_CREATE).click();
        page.getByLabel("Titre").first().fill(title("Invalide"));
        page.getByLabel("expand").click();
        
        // Ensure start and end dates are identical so time validation triggers reliably
        String startDate = page.getByTestId("start-date-input").inputValue();
        page.getByTestId("end-date-input").evaluate("el => el.removeAttribute('readonly')");
        page.getByTestId("end-date-input").fill(startDate);
        page.getByTestId("end-date-input").press("Enter");

        page.getByTestId("start-time-input").fill("14:00");
        page.getByTestId("end-time-input").fill("09:00");
        page.waitForTimeout(1500);

        assertThat(page.locator("[role=dialog]").last().innerText())
            .contains("L'heure de fin doit être après l'heure de début");
    }

    @Test
    @DisplayName("I18N-10 The recurrence summary of the preview is translated")
    void theRecurrenceSummaryIsTranslated(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Récurrent");
        var form = calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.WEEKLY).endsAfter(3);
        form.save();
        awaitAttached(calendar.eventCard(title));

        speaking(calendar, "Français");

        calendar.eventCard(title).first().click();
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(page.locator(".MuiPopover-root, [role=dialog]").last().innerText())
                .contains("Événement récurrent")
                .contains("hebdomadaire"));
    }

    @Test
    @DisplayName("I18N-11 The default calendar is named in the user's language")
    void theDefaultCalendarIsNamedInTheUserLanguage(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        PlaywrightAssertions.assertThat(calendar.calendarCheckbox("My calendar")).isVisible();

        speaking(calendar, "Français");

        PlaywrightAssertions.assertThat(calendar.calendarCheckbox("Mon calendrier"))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("I18N-12 HIDE_LANGUAGE_SELECTOR hides the language picker")
    void theLanguagePickerCanBeHidden(Page page, E2EUser user, RuntimeConfig config) {
        config.set("HIDE_LANGUAGE_SELECTOR", "true");
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.page().getByLabel("User profile").click();
        calendar.page().getByText("Settings").last().click();
        page.waitForTimeout(2500);

        PlaywrightAssertions.assertThat(page.getByLabel("Language selector")).hasCount(0);
    }

    @Test
    @DisplayName("I18N-13 A language chosen by the user outlives the configured default")
    void theUserChoiceOutlivesTheConfiguredDefault(Page page, E2EUser user, RuntimeConfig config) {
        // LANG only seeds the interface; the account's own setting is what the user sees, and
        // it must win over the deployment default on every load
        config.set("LANG", "'en'");
        CalendarPage calendar = LoginPage.loginAs(page, user);

        speaking(calendar, "Français");
        page.reload();
        calendar.waitUntilLoaded();

        PlaywrightAssertions.assertThat(page.getByLabel("Aujourd'hui", new Page.GetByLabelOptions().setExact(true)))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("I18N-14 No raw translation key ever shows up in the interface")
    void noRawTranslationKeyIsShown(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Clés");
        calendar.createEvent(title);
        calendar.openEvent(title);
        String withPreview = page.locator("body").innerText();
        calendar.page().reload();
        calendar.waitUntilLoaded();
        calendar.openSettings();
        String withSettings = page.locator("body").innerText();

        Pattern rawKey = Pattern.compile(
            "\\b(event|calendar|calendarPopover|menubar|settings|common|actions|eventPreview"
            + "|search|error|booking|print|tooltip|peopleSearch)\\.[a-zA-Z]+(\\.[a-zA-Z]+)*\\b");
        assertThat(rawKey.matcher(withPreview).find())
            .as("a raw key on screen means a missing translation: %s", withPreview)
            .isFalse();
        assertThat(rawKey.matcher(withSettings).find())
            .as("a raw key on screen means a missing translation: %s", withSettings)
            .isFalse();
    }
}
