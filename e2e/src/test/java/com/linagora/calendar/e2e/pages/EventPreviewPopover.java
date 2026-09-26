package com.linagora.calendar.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

/** The popover opened by clicking an event in the grid. */
public class EventPreviewPopover {
    private final Page page;

    public EventPreviewPopover(Page page) {
        this.page = page;
    }

    EventPreviewPopover waitUntilOpen() {
        // the title heading, not the Edit button: a guest invited to an event they do not own
        // gets the preview without the editing actions
        content().locator("h3").first().waitFor();
        return this;
    }

    public String text() {
        return page.locator(".MuiPopover-root, [role=dialog]").last().innerText();
    }

    public Locator content() {
        return page.locator(".MuiPopover-root, [role=dialog]").last();
    }

    public EventFormModal edit() {
        clickEdit();
        return new EventFormModal(page).waitUntilOpen().waitUntilFilledIn();
    }

    /**
     * Editing an occurrence of a series: the scope dialog comes up first, and the form only
     * opens once the caller has said what the edit applies to.
     */
    public EventFormModal edit(EventFormModal.Scope scope) {
        clickEdit();
        ScopeDialog dialog = ScopeDialog.waitFor(page);
        if (scope == EventFormModal.Scope.THIS_EVENT) {
            dialog.thisEvent();
        } else {
            dialog.allEvents();
        }
        return new EventFormModal(page).waitUntilOpen().waitUntilFilledIn();
    }

    /** Clicks Edit without assuming what comes next, for the tests that assert on it. */
    public void clickEdit() {
        page.getByLabel("Edit event").click();
    }

    public void delete() {
        page.getByLabel("Delete event").click();
        page.getByLabel("Delete event").waitFor(
            new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    /** Deleting an occurrence of a series first asks what it should apply to. */
    public void delete(EventFormModal.Scope scope) {
        page.getByLabel("Delete event").click();
        ScopeDialog dialog = ScopeDialog.waitFor(page);
        if (scope == EventFormModal.Scope.THIS_EVENT) {
            dialog.thisEvent();
        } else {
            dialog.allEvents();
        }
        page.getByLabel("Delete event").waitFor(
            new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    /** Answers the invitation: Yes, No or Maybe. */
    public void answer(String answer) {
        page.getByRole(com.microsoft.playwright.options.AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName(answer).setExact(true)).last().click();
    }

    /** Answers on a series: the scope dialog comes up in between. */
    public void answer(String answer, EventFormModal.Scope scope) {
        answer(answer);
        ScopeDialog dialog = ScopeDialog.waitFor(page);
        if (scope == EventFormModal.Scope.THIS_EVENT) {
            dialog.thisEvent();
        } else {
            dialog.allEvents();
        }
    }

    /**
     * Dismisses the preview. Escape leaves it open on this build, so this clicks away from it,
     * which is how a user actually gets rid of a popover.
     */
    public void close() {
        page.keyboard().press("Escape");
        if (page.getByLabel("Edit event").count() > 0) {
            page.mouse().click(5, 5);
        }
        page.getByLabel("Edit event").waitFor(
            new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    /**
     * Opens the overflow menu of the preview header. The button carries no accessible name, so
     * it is located as the unlabelled sibling of the Delete action.
     */
    public EventPreviewPopover moreOptions() {
        Locator siblings = page.getByLabel("Delete event").locator("xpath=..")
            .locator("button:not([aria-label])");
        for (int index = 0; index < siblings.count(); index++) {
            siblings.nth(index).click();
            page.waitForTimeout(500);
            if (page.locator("[role=menu], [role=menuitem]").count() > 0) {
                return this;
            }
        }
        throw new AssertionError("No overflow menu in the event preview");
    }

    /** Opens the personal settings of the event: the reminder and busy status of this user only. */
    public EventFormModal personalSettings() {
        moreOptions();
        page.getByText("Edit personal event settings").last().click();
        // this form is a restricted one: reminder, busy status and visibility, no title
        page.locator("[role=dialog]").last().waitFor();
        page.getByRole(com.microsoft.playwright.options.AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName("Save").setExact(true)).last().waitFor();
        return new EventFormModal(page);
    }

    /** Duplicates the event, which opens the creation modal on the copy. */
    public EventFormModal duplicate() {
        moreOptions();
        page.getByText("Duplicate event").last().click();
        return new EventFormModal(page).waitUntilOpen();
    }

    /** Downloads the .ics of the event and returns its content. */
    public String export() {
        var download = page.waitForDownload(() ->
            page.getByLabel("Export event details to .ics file").click());
        java.nio.file.Path target = java.nio.file.Paths.get("target", "downloads",
            download.suggestedFilename());
        download.saveAs(target);
        try {
            return java.nio.file.Files.readString(target);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Cannot read the exported calendar", e);
        }
    }

    /** Expands the participant list and the extra details. */
    public EventPreviewPopover showMore() {
        page.getByText("Show more").last().click();
        return this;
    }
}
