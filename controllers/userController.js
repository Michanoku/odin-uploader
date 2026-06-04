import passport from "passport";
import { generateHash } from "../lib/passwordUtils.js";
import * as db from "../db/userQueries.js";
import { ResultWithContextImpl } from "express-validator/lib/chain/index.js";
import { body, validationResult, matchedData } from "express-validator";

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

const validateLogin = [
  body("username").trim().notEmpty().withMessage("Username is required."),
  body("password").trim().notEmpty().withMessage("Password is required."),
];

const getLogin = (req, res) => {
  res.render("users/login", { title: "Login" });
};

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

const getRegister = (req, res) => {
  res.render("users/register", { title: "Register" });
};

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
    const { username, password } = matchedData(req);
    const hash = generateHash(password);

    const newUser = await db.createUser(username, hash);
    req.login(newUser, (err) => {
      if (err) {
        return next(err);
      }

      res.redirect("/");
    });
  },
];

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
