import passport from "passport";
import { body, validationResult, matchedData } from "express-validator";

import { generateHash } from "../lib/passwordUtils.js";
import * as db from "../db/userQueries.js";

// Validation for user registration
const validateRegister = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required.")
    .bail()
    .isLength({ min: 2, max: 32 })
    .withMessage(`Username must be between 2 and 32 characters.`),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required.")
    .bail()
    .isLength({ min: 12, max: 72 })
    .withMessage(`Password must be between 12 and 72 characters.`),
  body("confirmation")
    .trim()
    .notEmpty()
    .withMessage("Confirmation is required.")
    .bail()
    .custom((value, { req }) => {
      const confirmation = req.body.password === value;
      if (!confirmation) {
        throw new Error("Confirmation does not match password.");
      }
      return true;
    }),
];

// Validation for login
const validateLogin = [
  body("username").trim().notEmpty().withMessage("Username is required."),
  body("password").trim().notEmpty().withMessage("Password is required."),
];

// Get route for Login page
const getLogin = (req, res) => {
  res.render("users/login", { title: "Login" });
};

// Post route for Login page
const postLogin = [
  validateLogin,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("users/login", {
        title: "Login",
        errors: errors.array(),
      });
    }
    next();
  },
  passport.authenticate("local", {
    failureRedirect: "/login",
    successRedirect: "/",
  }),
];

// Get route for register page
const getRegister = (req, res) => {
  res.render("users/register", { title: "Register" });
};

// Post route for register page
const postRegister = [
  validateRegister,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("users/register", {
        title: "Register",
        errors: errors.array(),
      });
    }
    // If the validation passed, generate a hash with the user password
    const { username, password } = matchedData(req);
    const hash = generateHash(password);

    // Create the user with the username and hash
    const newUser = await db.createUser(username, hash);
    req.login(newUser, (err) => {
      if (err) {
        return next(err);
      }

      res.redirect("/");
    });
  },
];

// Get route for logout
const getLogout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
};

// Test your auth, remove if no longer needed
const getProtected = async (req, res) => {
  res.send("User authenticated.");
};

export {
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  getLogout,
  getProtected,
};
