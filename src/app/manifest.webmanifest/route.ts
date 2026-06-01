export const dynamic = "force-static";

export function GET() {
  const manifest = {
    name: "Badger — Money Companion",
    short_name: "Badger",
    description: "Your friendly personal money management companion.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#faf9f6",
    theme_color: "#10b981",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
