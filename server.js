import app from "./app.js";

const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_END === "development";

// Server
if (isDev) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dev Server running on http://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Live Server running on port ${PORT}`);
  });
}
