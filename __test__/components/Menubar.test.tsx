import React from "react";
import { screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Menubar } from "../../src/components/Menubar/Menubar";
import { renderWithProviders } from "../utils/Renderwithproviders";

describe("Calendar App Component Display Tests", () => {
  test("renders the Navbar component", () => {
    renderWithProviders(<Menubar />);
    const navbarElement = screen.getByText("Twake");
    expect(navbarElement).toBeInTheDocument();
  });
});
