import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface EnergyResult {
  mainCharacter: number;
  npcEnergy: number;
  plotArmor: "Low" | "Medium" | "High";
  caption: string;
  fid: number;
  avatarUrl: string;
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
  const plotArmor: EnergyResult["plotArmor"] = armorSeed > 70 ? "High" : armorSeed > 40 ? "Medium" : "Low";

  const caption = captions[hash % captions.length];

  const fid = (hash % 900000) + 10000;

  const avatarUrl = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(base.toLowerCase())}`;

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
  const [connected, setConnected] = useState<boolean>(false);
  const [result, setResult] = useState<EnergyResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const effectiveHandle = handle.trim() || (connected ? "farcaster" : "");

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const value = effectiveHandle.trim();

    if (!value) {
      toast({
        title: "Handle required",
        description: "Type a Farcaster username or use the connect option.",
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
      const metrics = generateMetrics(value);
      setResult(metrics);
      toast({
        title: "Main Character Energy calculated",
        description: "Screenshot this card and post it to your feed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectClick = () => {
    setConnected(true);
    if (!handle) {
      setHandle("@farcaster");
    }
    toast({
      title: "Mock Farcaster connect enabled",
      description: "This demo version simulates a Farcaster connection for now.",
    });
  };

  const handleShare = async () => {
    if (!result || !effectiveHandle) {
      toast({
        title: "Nothing to share yet",
        description: "Generate your Main Character Energy first.",
      });
      return;
    }

    const username = effectiveHandle.startsWith("@") ? effectiveHandle : `@${effectiveHandle}`;

    const shareText = [
      `Main Character Energy scan for ${username}`,
      `Main Character Energy: ${result.mainCharacter}%`,
      `NPC Energy: ${result.npcEnergy}%`,
      `Plot Armor: ${result.plotArmor}`,
      "",
      "Generated on Main Character Energy",
    ].join("\n");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        toast({ title: "Copied for Farcaster", description: "Paste into your next cast and tag your friends." });
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Could not copy",
        description: "Select and copy the stats manually instead.",
        variant: "destructive",
      });
    }
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
          className="w-full max-w-3xl transform-gpu transition-transform duration-500 ease-out hover:-translate-y-1"
        >
          <Card className="mce-hero-card">
            <div className="mce-hero-orbit" aria-hidden="true" />

            <CardHeader className="mce-hero-inner flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                <p className="mce-metric-label">Farcaster Vibes Scanner</p>
                <h1
                  id="main-character-energy-heading"
                  className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl"
                >
                  Drop your handle. Get your Main Character Energy.
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                  Not serious. Not on-chain. Just a vibe check for how much main-character energy you are radiating today.
                </p>
              </div>

              <div className="flex flex-col items-start justify-end gap-3 text-sm text-muted-foreground">
                <div className="mce-badge-soft">Made for screenshotting and casting.</div>
                <div className="flex items-center gap-3 text-xs sm:text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span>Zero data stored · Purely for fun</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="mce-hero-inner flex flex-col gap-8 pb-7 pt-2 sm:pb-8 sm:pt-0">
              <form
                onSubmit={onSubmit}
                className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/40 p-4 backdrop-blur-sm sm:flex-row sm:items-end"
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
                      onChange={(event) => setHandle(event.target.value ? `@${event.target.value.replace(/^@/, "")}` : "")}
                      className="flex-1 bg-background/60 text-base"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:w-48">
                  <Button type="submit" variant="hero" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Calculating" : "Scan vibes"}
                  </Button>
                  <Button
                    type="button"
                    variant={connected ? "secondary" : "outline"}
                    size="sm"
                    onClick={handleConnectClick}
                  >
                    {connected ? "Farcaster connected" : "Mock connect with Farcaster"}
                  </Button>
                </div>
              </form>

              <section
                aria-label="Main Character Energy results"
                className="grid gap-6 rounded-2xl border border-border/70 bg-background/40 p-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:gap-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 rounded-2xl border border-border/70 bg-background/60">
                      {usernameForAvatar ? (
                        <AvatarImage src={result?.avatarUrl} alt={`Avatar for ${usernameForAvatar}`} />
                      ) : null}
                      <AvatarFallback className="rounded-2xl text-xs uppercase">
                        {usernameForAvatar ? usernameForAvatar.slice(0, 2) : "MC"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {effectiveHandle ? (effectiveHandle.startsWith("@") ? effectiveHandle : `@${effectiveHandle}`) : "@yourhandle"}
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
                      <p className="mce-metric-value">{result ? `${result.npcEnergy}%` : "--%"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="mce-metric-label">Plot Armor</p>
                      <p className="mce-metric-value">{result ? result.plotArmor : "–"}</p>
                    </div>
                  </div>

                  <p className="mce-caption">
                    {result
                      ? result.caption
                      : "Hit \"Scan vibes\" to see whether you are main character coded or deep background lore."}
                  </p>
                </div>

                <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border/60 bg-secondary/40 p-4 text-sm shadow-inner">
                  <div className="space-y-2">
                    <p className="mce-metric-label">Cast-ready copy</p>
                    <p className="text-xs text-muted-foreground">
                      We will copy a plain-text summary you can paste straight into Farcaster.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-xs text-muted-foreground">
                    <pre className="whitespace-pre-wrap break-words text-[0.7rem] leading-relaxed">
                      {result ? (
                        <>
                          Main Character Energy scan for
                          {" "}
                          {effectiveHandle.startsWith("@") ? effectiveHandle : `@${effectiveHandle}`}
                          {"\n"}
                          Main Character Energy: {result.mainCharacter}%
                          {"\n"}
                          NPC Energy: {result.npcEnergy}%
                          {"\n"}
                          Plot Armor: {result.plotArmor}
                          {"\n\n"}
                          Generated on Main Character Energy
                        </>
                      ) : (
                        "Preview will appear here after you run a scan."
                      )}
                    </pre>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button type="button" onClick={handleShare} size="sm" variant="default">
                      Share this
                    </Button>
                    <p className="text-[0.7rem] text-muted-foreground">
                      Tip: Crop to the card for a clean, feed-friendly screenshot.
                    </p>
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
