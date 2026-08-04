import "./config/env.js";

import path from "path";
import { fileURLToPath } from "url";

import compression from "compression";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";
import passport from "passport";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";

import "./config/passport.js";
import { prisma } from "./lib/prisma.js";
import browserRoutes from "./routes/browserRoutes.js";
import sharedRoutes from "./routes/sharedRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { formatFileSize } from "./lib/browserUtils.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware for logging, formdata and json
app.use(helmet());
app.use(compression());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Configure the session and cookie
const sessionConfig = {
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};
// If we are not testing, use prisma to store session
if (process.env.NODE_ENV !== "test") {
  sessionConfig.store = new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000,
    dbRecordIdIsSessionId: false,
  });
}
app.set("trust proxy", 1);
app.use(session(sessionConfig));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Store user in locals (if any)
app.use(async (req, res, next) => {
  if (req.user) {
    res.locals.user = req.user;
    const result = await prisma.file.aggregate({
      where: {
        userId: req.user.id,
      },
      _sum: {
        size: true,
      },
    });
    res.locals.storage = formatFileSize(result._sum.size);
  } else {
    res.locals.user = null;
    res.locals.storage = null;
  }
  next();
});

// Routes
app.use("/", userRoutes);
app.use("/", browserRoutes);
app.use("/", sharedRoutes);

// 404
app.use((req, res) => {
  res.status(404).render("error", {
    title: "Not Found",
    errorTitle: 404,
    errorMessage: "This page does not exist.",
  });
});

// Error Handler
app.use((err, req, res, _next) => {
  // If the error is caused by file upload
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        errors: [
          {
            path: "file",
            msg: "File exceeds the maximum allowed size.",
          },
        ],
      });
    }
  }
  const status = err.status || 500;
  if (status !== 404) {
    console.error(err);
  }

  res.status(status).render("error", {
    title: "Error",
    errorTitle: status,
    errorMessage: err.message || "Something went wrong.",
  });
});

export default app;
