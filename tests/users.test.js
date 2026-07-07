import request from "supertest";

import app from "../app.js";

describe("Authentication", () => {
  const agent = request.agent(app);

  test("user can register and access protected route", async () => {
    const registerResponse = await agent.post("/register").type("form").send({
      username: "testuser",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    expect(registerResponse.status).toBe(302);
    expect(registerResponse.headers.location).toBe("/");

    const protectedResponse = await agent.get("/protected");

    expect(protectedResponse.status).toBe(200);
    expect(protectedResponse.text).toContain("User authenticated");
  });

  test("logged out user cannot access protected route", async () => {
    await agent.get("/logout");

    const protectedResponse = await agent.get("/protected");

    expect(protectedResponse.status).toBe(302);
    expect(protectedResponse.headers.location).toBe("/login");
  });
});
