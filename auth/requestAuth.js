// auth/requestAuth.js
import dotenv from "dotenv";
import fs from "fs/promises";
import fetch from "node-fetch";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKENS_FILE = path.join(__dirname, "../cache/tokens.json");

export async function requestAuth() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const redirectUri = "http://localhost/exchange_token";

  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=read,activity:read_all`;

  console.log("\n🌐 Ouvre ce lien dans ton navigateur :");
  console.log(authUrl);
  console.log(
    "\n📋 Copie le code affiché dans l'URL de redirection et colle-le ici.\n"
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    rl.question("Code d'autorisation : ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenResponse.json();

  await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf-8");

  console.log("✅ Authentification réussie, tokens sauvegardés.");
  return tokens;
}
