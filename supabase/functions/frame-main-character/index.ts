import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const neynarApiKey = Deno.env.get("NEYNAR_API_KEY");

function hashHandle(handle: string): number {
  let hash = 0;
  for (let i = 0; i < handle.length; i++) {
    hash = (hash << 5) - hash + handle.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function generateMetrics(handle: string) {
  const normalized = handle.toLowerCase().replace(/^@/, "").trim();
  const hash = hashHandle(normalized || "anon");

  const mainCharacter = (hash % 51) + 50; // 50–100
  const npcEnergy = 100 - (hash % 41); // 59–100 flipped
  const plotArmorLevels = ["Low", "Medium", "High"] as const;
  const plotArmor = plotArmorLevels[hash % plotArmorLevels.length];

  return { mainCharacter, npcEnergy, plotArmor };
}

function buildFrameHtml(opts: {
  handle: string;
  imageUrl: string;
  appUrl: string;
}) {
  const { handle, imageUrl, appUrl } = opts;
  const normalized = handle.toLowerCase().replace(/^@/, "").trim();
  const { mainCharacter, npcEnergy, plotArmor } = generateMetrics(normalized);

  const subtitle =
    normalized.length > 0
      ? `@${normalized}: MC ${mainCharacter} · NPC ${npcEnergy} · Armor ${plotArmor}`
      : "Drop your handle to scan your Main Character Energy";

  const state = JSON.stringify({ handle: normalized }).replace(/"/g, "&quot;");

 return `<!doctype html>
<html>
  <head>
    <meta property="og:title" content="Main Character Energy" />
    <meta property="og:description" content="${subtitle}" />
    <meta property="og:image" content="${imageUrl}" />

    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:button:1" content="Scan again" />
    <meta property="fc:frame:button:1:action" content="post" />
    <meta property="fc:frame:input:text" content="Enter your Farcaster handle" />
    <meta property="fc:frame:state" content="${state}" />
    <meta property="fc:frame:post_url" content="${appUrl}/frame-main-character" />
  </head>

  <body></body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Use the public functions domain for Farcaster frame callbacks
  const appUrl = "https://yatrugjplwgsqnehumcu.functions.supabase.co";
  const imageUrl = "https://lovable.dev/opengraph-image-p98pqg.png";

  try {
    if (req.method === "GET") {
      const html = buildFrameHtml({ handle: "", imageUrl, appUrl });
      return new Response(html, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const untrustedData = body.untrustedData || {};
      const inputText: string = (untrustedData.inputText || "").toString();

      const html = buildFrameHtml({ handle: inputText, imageUrl, appUrl });
      return new Response(html, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error in frame-main-character:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
