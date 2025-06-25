import React from "react";
import { screen } from "@testing-library/react";
import App from "../src/App";
import { JSX } from "react/jsx-runtime";

test("renders learn react link", () => {
  renderWithProviders(<App />);
  const linkElement = screen.getByText("Twake");
  expect(linkElement).toBeInTheDocument();
});
function renderWithProviders(arg0: JSX.Element) {
  throw new Error("Function not implemented.");
}
