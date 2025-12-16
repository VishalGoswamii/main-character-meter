import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EnergyResult {
  mainCharacter: number;
  npcEnergy: number;
  plotArmor: "Low" | "Medium" | "High";
  caption: string;
  fid: number;
  avatarUrl: string;
  displayName?: string;
  username?: string;
}

const captions = [
  "Plot twist: you were the main character the whole time.",
  "Side quests completed. Main quest energy unlocked.",
  "You give " + "\"I know the author\"" + " energy.",
  "NPCs are just background characters in your highlight reel.",
  "Somewhere, a writer is adding you to season two.",
];

function hashHandle(handle: string): number {
  let hash = 0;
  for (let i = 0; i < handle.length; i += 1) {
    hash = (hash * 31 + handle.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function generateMetrics(handle: string): EnergyResult {
  const trimmed = handle.trim().replace(/^@/, "");
  const base = trimmed || "maincharacter";
  const hash = hashHandle(base || "maincharacter");

  const mainCharacter = (hash % 51) + 50; // 50-100
  const npcEnergyRaw = 100 - mainCharacter + ((hash >> 3) % 11) - 5; // slight wobble
  const npcEnergy = Math.max(0, Math.min(100, npcEnergyRaw));

  const armorSeed = (hash >> 7) % 100;
  const plotArmor: EnergyResult["plotArmor"] =
    armorSeed > 70 ? "High" : armorSeed > 40 ? "Medium" : "Low";

  const caption = captions[hash % captions.length];

  const fid = (hash % 900000) + 10000;

  const avatarUrl = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(
    base.toLowerCase(),
  )}`;

  return {
    mainCharacter,
    npcEnergy,
    plotArmor,
    caption,
    fid,
    avatarUrl,
  };
}

const Index = () => {
  const [handle, setHandle] = useState<string>("");
  const [result, setResult] = useState<EnergyResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready();
        console.log("Farcaster Frame SDK ready");
      } catch (err) {
        console.log("Not running inside Farcaster Frame SDK context", err);
      }
    };

    // Only run on client
    if (typeof window !== "undefined") {
      void init();
    }
  }, []);

  const effectiveHandle = handle.trim();

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const value = effectiveHandle.trim();

    if (!value) {
      toast({
        title: "Handle required",
        description: "Type a Farcaster username.",
        variant: "destructive",
      });
      return;
    }

    if (value.length > 32) {
      toast({
        title: "That handle seems too long",
        description: "Please use a Farcaster username up to 32 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "get-farcaster-profile",
        {
          body: { username: value.replace(/^@/, "") },
        },
      );

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Failed to fetch profile",
          description: "Could not connect to Farcaster. Try again.",
          variant: "destructive",
        });
        return;
      }

      if (!data || (data as any).error) {
        toast({
          title: "User not found",
          description: (data as any)?.error ||
            "This Farcaster user doesn't exist.",
          variant: "destructive",
        });
        return;
      }

      const metrics = generateMetrics(value);
      const profile = data as any;

      setResult({
        ...metrics,
        fid: profile.fid,
        avatarUrl: profile.pfp_url,
        displayName: profile.display_name,
        username: profile.username,
      });

      toast({
        title: "Main Character Energy calculated",
        description: "Screenshot this card and post it to your feed.",
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = () => {
    if (!result || !effectiveHandle) {
      toast({
        title: "Nothing to share yet",
        description: "Generate your Main Character Energy first.",
      });
      return;
    }

    const username = result.username || effectiveHandle.replace(/^@/, "");
    const appUrl = window.location.origin + window.location.pathname;

    const shareText = [
      `Main Character Energy: ${result.mainCharacter}%`,
      `NPC Energy: ${result.npcEnergy}%`,
      `Plot Armor: ${result.plotArmor}`,
      "",
      result.caption,
      "",
      `@${username} • FID: ${result.fid}`,
      "",
      `Scan your vibes: ${appUrl}`,
    ].join("\n");

    const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(
      shareText,
    )}`;
    window.open(warpcastUrl, "_blank");

    toast({
      title: "Opening Warpcast",
      description: "Confirm your cast in the new tab.",
    });
  };

  const usernameForAvatar = effectiveHandle.replace(/^@/, "");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-center px-4 pt-8 sm:pt-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span>Main Character Energy</span>
          <span className="hidden text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground/80 sm:inline">
            Farcaster Edition
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <section
          aria-labelledby="main-character-energy-heading"
          className="w-full max-w-xl transform-gpu transition-transform duration-500 ease-out hover:-translate-y-1"
        >
          <Card className="mce-hero-card">
            <div className="mce-hero-orbit" aria-hidden="true" />

            <CardHeader className="mce-hero-inner flex flex-col gap-4">
              <div className="space-y-3">
                <p className="mce-metric-label">Farcaster Vibes Scanner</p>
                <h1
                  id="main-character-energy-heading"
                  className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
                >
                  Drop your handle. Get your Main Character Energy.
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                  A quick, unserious vibe check for how much main-character energy you
                  are radiating today.
                </p>
              </div>

              <div className="flex flex-col items-start justify-end gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3 text-xs sm:text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span>Zero data stored · Purely for fun</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="mce-hero-inner flex flex-col gap-8 pb-7 pt-2 sm:pb-8 sm:pt-0">
              <form
                onSubmit={onSubmit}
                className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/40 p-4 backdrop-blur-sm"
                aria-label="Enter Farcaster username to calculate Main Character Energy"
              >
                <div className="flex-1 space-y-2">
                  <Label htmlFor="handle">Farcaster username</Label>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-sm text-muted-foreground sm:inline">@</span>
                    <Input
                      id="handle"
                      autoComplete="off"
                      placeholder="yourhandle"
                      value={handle.replace(/^@/, "")}
                      onChange={(event) =>
                        setHandle(
                          event.target.value
                            ? `@${event.target.value.replace(/^@/, "")}`
                            : "",
                        )
                      }
                      className="flex-1 bg-background/60 text-base"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:w-48">
                  <Button type="submit" variant="hero" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Calculating" : "Scan vibes"}
                  </Button>
                </div>
              </form>

              <section
                aria-label="Main Character Energy results"
                className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/40 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:gap-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 rounded-2xl border border-border/70 bg-background/60">
                      {usernameForAvatar ? (
                        <AvatarImage
                          src={result?.avatarUrl}
                          alt={`Avatar for ${usernameForAvatar}`}
                        />
                      ) : null}
                      <AvatarFallback className="rounded-2xl text-xs uppercase">
                        {usernameForAvatar ? usernameForAvatar.slice(0, 2) : "MC"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {effectiveHandle
                          ? effectiveHandle.startsWith("@")
                            ? effectiveHandle
                            : `@${effectiveHandle}`
                          : "@yourhandle"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Farcaster FID: {result ? result.fid : "••••••"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <p className="mce-metric-label">Main Character Energy</p>
                      <p className="mce-metric-value">
                        {result ? `${result.mainCharacter}%` : "--%"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="mce-metric-label">NPC Energy</p>
                      <p className="mce-metric-value">
                        {result ? `${result.npcEnergy}%` : "--%"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="mce-metric-label">Plot Armor</p>
                      <p className="mce-metric-value">
                        {result ? result.plotArmor : "–"}
                      </p>
                    </div>
                  </div>

                  <p className="mce-caption">
                    {result
                      ? result.caption
                      : 'Hit "Scan vibes" to see whether you are main character coded or deep background lore.'}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={handleShare}
                      size="lg"
                      variant="hero"
                      className="w-full sm:w-auto"
                    >
                      Share this scan
                    </Button>
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Index;
