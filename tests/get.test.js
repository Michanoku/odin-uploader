import request from "supertest";
import app from "../app.js";

test("GET / should return 200", async () => {
  const res = await request(app).get("/");
  expect(res.statusCode).toBe(200);
});

test("GET /nonexistent should return 404", async () => {
  const res = await request(app).get("/does-not-exist");
  expect(res.statusCode).toBe(404);
});
