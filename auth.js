import dotenv from "dotenv";
import http from "http";
import fetch from "node-fetch";
import open from "open";

dotenv.config();

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/callback";

async function saveTokensToFile(tokens) {
  try {
    await fs.writeFile("cache/tokens.json", JSON.stringify(tokens, null, 2));
    console.log("💾 Tokens enregistrés dans tokens.json !");
  } catch (err) {
    console.error("❌ Erreur d'écriture du fichier tokens.json :", err);
  }
}

export function startAuthFlow() {
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&approval_prompt=force&scope=read,activity:read_all`;

  console.log("➡️  Ouverture de l'URL d'auth Strava...");
  open(authUrl);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, REDIRECT_URI);
    const code = url.searchParams.get("code");

    if (code) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(" Authentification reussie. Tu peux fermer cette fenetre.");
      server.close();

      console.log("📥 Code reçu :", code);

      // Échange le code contre un token
      const tokenRes = await fetch(
        "https://www.strava.com/api/v3/oauth/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            grant_type: "authorization_code",
          }),
        }
      );

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();

        const tokensToSave = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
        };

        console.log("🔑 Access + refresh token obtenus");

        await saveTokensToFile(tokensToSave);
      }
    } else {
      res.writeHead(400);
      res.end("Erreur : code non trouvé");
    }
  });

  server.listen(3000, () => {
    console.log(
      "🖥️  Serveur local en écoute sur http://localhost:3000/callback"
    );
  });
}

startAuthFlow();
