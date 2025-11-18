import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Login from "../routes/Login";
import { MemoryRouter } from "react-router-dom";

describe("Login page", () => {
  it("shows validation errors", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    const button = screen.getByRole("button", { name: /masuk/i });
    fireEvent.click(button);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
