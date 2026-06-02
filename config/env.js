// This file loads the required env file so every other module can use it
import dotenv from "dotenv";

// When testing, use another env file specific for that in the dev environment
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";

dotenv.config({ path: envFile });
