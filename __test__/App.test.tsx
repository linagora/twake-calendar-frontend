import React from "react";
import { screen } from "@testing-library/react";
import App from "../src/App";
import { JSX } from "react/jsx-runtime";
import { renderWithProviders } from "./utils/Renderwithproviders";

test("renders app", () => {
  renderWithProviders(<App />);
  const linkElement = screen.getByText("Twake");
  expect(linkElement).toBeInTheDocument();
});
