import { queryYouTube } from "./_yt";

export default async function handler(req: any, res: any) {
  const q = (req.query?.q || "").toString();
  res.setHeader("Content-Type", "application/json; charset=utf-8");

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
    return res.status(200).json(videos);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Error al buscar" });
  }
}
