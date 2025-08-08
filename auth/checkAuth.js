import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { refreshTokens } from "./refreshTokens.js";
import { requestAuth } from "./requestAuth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKENS_FILE = path.join(__dirname, "../cache/tokens.json");

export async function checkAuth() {
  try {
    const data = await fs.readFile(TOKENS_FILE, "utf-8");
    const tokens = JSON.parse(data);

    const now = Math.floor(Date.now() / 1000);

    if (tokens.expires_at > now) {
      console.log("✅ Tokens valides.");
      return tokens;
    } else {
      console.log("🔄 Tokens expirés, rafraîchissement en cours...");
      return await refreshTokens(tokens.refresh_token);
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("⚠️ Aucun token trouvé, authentification requise.");
      return await requestAuth();
    }
    throw err;
  }
}
