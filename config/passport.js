// This file contains the setup and config for passport and is imported into app.js
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { validatePassword } from "../lib/passwordUtils.js";
import { lookupUserByName, lookupUserById } from "../db/userQueries.js";

const verifyCallback = async (username, password, done) => {
  try {
    const user = await lookupUserByName(username);
    if (!user) {
      return done(null, false);
    }

    const isValid = validatePassword(password, user.hash);

    if (isValid) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  } catch (err) {
    return done(err);
  }
};

const strategy = new LocalStrategy(verifyCallback);

passport.use(strategy);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (userId, done) => {
  try {
    const user = await lookupUserById(userId);
    if (user) {
      return done(null, user);
    }
  } catch (err) {
    return done(err);
  }
});
