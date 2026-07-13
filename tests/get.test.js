// Simple check if regular get and 404 works
import request from "supertest";

import app from "../app.js";

test("GET / should return 200", async () => {
  const response = await request(app).get("/");
  expect(response.statusCode).toBe(200);
});

test("GET /nonexistent should return 404", async () => {
  const response = await request(app).get("/does-not-exist");
  expect(response.statusCode).toBe(404);
});
