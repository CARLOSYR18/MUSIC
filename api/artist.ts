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
    const [searchData, albumData] = await Promise.all([
      queryYouTube("search", { query: q }),
      queryYouTube("search", { query: q + " album" }).catch(() => ({})),
    ]);

    const contents =
      searchData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

    let artist: any = null;
    const top: any[] = [];

    for (const item of contents) {
      if (item.officialCardViewModel && !artist) {
        const h = item.officialCardViewModel.header?.pageHeaderViewModel;
        const name = h?.title?.dynamicTextViewModel?.text?.content || "";
        const img = h?.image?.contentPreviewImageViewModel?.image?.sources?.[0]?.url || "";
        const id =
          h?.title?.dynamicTextViewModel?.rendererContext?.commandContext?.onTap?.innertubeCommand?.browseEndpoint?.browseId || "";
        artist = {
          id,
          name,
          avatar: img,
          subsText: "Artista oficial",
        };
      } else if (item.channelRenderer && !artist) {
        const c = item.channelRenderer;
        const thumbs = c.thumbnail?.thumbnails || [];
        artist = {
          id: c.channelId,
          name: c.title?.simpleText || "",
          avatar: thumbs[thumbs.length - 1]?.url || "",
          subsText: c.videoCountText?.simpleText || "",
        };
      }

      if (item.videoRenderer && top.length < 10) {
        const v = item.videoRenderer;
        const thumbs = v.thumbnail?.thumbnails || [];
        top.push({
          id: v.videoId,
          title: v.title?.runs?.[0]?.text || "",
          channel: v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || "",
          thumb: thumbs[thumbs.length - 1]?.url || "",
        });
      }
    }

    const albumContents =
      albumData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const albums: any[] = [];
    for (const item of albumContents) {
      if (item.lockupViewModel && item.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_PLAYLIST") {
        const l = item.lockupViewModel;
        const thumbs = l.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources || [];
        albums.push({
          id: l.contentId,
          title: (l.metadata?.lockupMetadataViewModel?.title?.content || "").replace(/^(album|álbum)\s*-\s*/i, ""),
          thumb: thumbs[thumbs.length - 1]?.url || "",
        });
      } else if (item.playlistRenderer) {
        const p = item.playlistRenderer;
        const thumbs = p.thumbnails?.[0]?.thumbnails || [];
        albums.push({
          id: p.playlistId,
          title: (p.title?.simpleText || "").replace(/^(album|álbum)\s*-\s*/i, ""),
          thumb: thumbs[thumbs.length - 1]?.url || "",
        });
      }
    }

    return new Response(JSON.stringify({ artist: artist ? { channel: artist, top, albums } : null }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Error al buscar artista" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
