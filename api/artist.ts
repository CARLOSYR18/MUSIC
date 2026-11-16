import { queryYouTube } from "./_yt";

export default async function handler(req: any, res: any) {
  const q = (req.query?.q || "").toString();
  res.setHeader("Content-Type", "application/json; charset=utf-8");

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

    return res.status(200).json({ artist: artist ? { channel: artist, top, albums } : null });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Error al buscar artista" });
  }
}
