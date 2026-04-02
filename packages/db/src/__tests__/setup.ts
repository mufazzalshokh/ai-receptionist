import { resolve } from "path";
import { config } from "dotenv";

// Load .env from packages/db/.env
config({ path: resolve(__dirname, "../../.env") });
