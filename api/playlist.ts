export const config = {
  runtime: "edge",
};

async function queryYouTube(endpoint: string, body: any) {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20240101.00.00",
          hl: "es",
          gl: "PE",
        },
      },
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`YouTube responded with ${res.status}`);
  return res.json();
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
  const browseId = id.startsWith("VL") ? id : "VL" + id;

  try {
    const data = await queryYouTube("browse", { browseId });
    const items =
      data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const tracks: any[] = [];
    for (const item of items) {
      if (item.playlistVideoRenderer) {
        const v = item.playlistVideoRenderer;
        const thumbs = v.thumbnail?.thumbnails || [];
        tracks.push({
          id: v.videoId,
          title: v.title?.runs?.[0]?.text || "",
          channel: v.shortBylineText?.runs?.[0]?.text || "",
          thumb: thumbs[thumbs.length - 1]?.url || "",
        });
      }
    }
    return new Response(JSON.stringify(tracks), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Error al cargar playlist" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
