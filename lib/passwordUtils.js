// Password utils mostly as seen in yt tutorials during express practice
import bcrypt from "bcryptjs";

// Verify password
function validatePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// Generate hash
function generateHash(password) {
  const saltRounds = 10;
  const hash = bcrypt.hashSync(password, saltRounds);

  return hash;
}

export { validatePassword, generateHash };
