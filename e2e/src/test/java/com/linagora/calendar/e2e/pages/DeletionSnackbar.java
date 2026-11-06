package com.linagora.calendar.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * The snackbar a deletion shows for a few seconds. The event is gone from the grid at once,
 * but the request only leaves once the snackbar does: Undo sends nothing at all.
 */
public class DeletionSnackbar {
    /** How long a deletion waits for an undo before its request goes out. */
    public static final int UNDO_WINDOW_MS = 3_000;

    private final Page page;

    DeletionSnackbar(Page page) {
        this.page = page;
    }

    DeletionSnackbar waitUntilShown() {
        locator().waitFor();
        return this;
    }

    public Locator locator() {
        return page.getByRole(AriaRole.ALERT)
            .filter(new Locator.FilterOptions().setHas(undoButton()))
            .last();
    }

    public String message() {
        return locator().innerText();
    }

    public void undo() {
        undoButton().last().click();
        locator().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    private Locator undoButton() {
        return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Undo").setExact(true));
    }
}
