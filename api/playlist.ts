import { queryYouTube } from "./_yt";

export default async function handler(req: any, res: any) {
  const id = (req.query?.id || "").toString();
  const browseId = id.startsWith("VL") ? id : "VL" + id;
  res.setHeader("Content-Type", "application/json; charset=utf-8");

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
    return res.status(200).json(tracks);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Error al cargar playlist" });
  }
}
