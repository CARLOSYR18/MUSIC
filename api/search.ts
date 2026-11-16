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
  const q = url.searchParams.get("q") || "";

  try {
    const data = await queryYouTube("search", { query: q });
    const contents =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const videos: any[] = [];
    for (const item of contents) {
      if (item.videoRenderer) {
        const v = item.videoRenderer;
        const thumbs = v.thumbnail?.thumbnails || [];
        videos.push({
          id: v.videoId,
          title: v.title?.runs?.[0]?.text || "",
          channel: v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || "",
          thumb: thumbs[thumbs.length - 1]?.url || "",
        });
      }
    }
    return new Response(JSON.stringify(videos), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Error al buscar" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
