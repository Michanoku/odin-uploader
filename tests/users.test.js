import request from "supertest";

import app from "../app.js";

describe("Authentication", () => {
  const agent = request.agent(app);

  test("user can register and access protected route", async () => {
    // Create a user and see if they are redirected correctly
    const registerResponse = await agent.post("/register").type("form").send({
      username: "testuser",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    expect(registerResponse.status).toBe(302);
    expect(registerResponse.headers.location).toBe("/");

    // See if the user can access the protected route 
    const protectedResponse = await agent.get("/protected");

    expect(protectedResponse.status).toBe(200);
    expect(protectedResponse.text).toContain("User authenticated");
  });

  test("logged out user cannot access protected route", async () => {
    await agent.get("/logout");

    // See if logged out user can access the protected route
    const protectedResponse = await agent.get("/protected");

    expect(protectedResponse.status).toBe(302);
    expect(protectedResponse.headers.location).toBe("/login");
  });
});
