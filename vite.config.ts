import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";

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
        },
      },
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`YouTube responded with ${res.status}`);
  return res.json();
}

function youtubeApiPlugin(): Plugin {
  return {
    name: "youtube-api-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();

        const url = new URL(req.url, "http://localhost");
        const endpoint = url.pathname;
        const q = url.searchParams.get("q") || "";

        res.setHeader("Content-Type", "application/json; charset=utf-8");

        try {
          if (endpoint === "/api/search") {
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
            res.end(JSON.stringify(videos));
            return;
          }

          if (endpoint === "/api/artist") {
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

            // Albums / playlists
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

            res.end(JSON.stringify({ artist: artist ? { channel: artist, top, albums } : null }));
            return;
          }

          if (endpoint === "/api/playlist") {
            const id = url.searchParams.get("id") || "";
            const browseId = id.startsWith("VL") ? id : "VL" + id;
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
              } else if (item.lockupViewModel) {
                const l = item.lockupViewModel;
                const thumbs = l.contentImage?.thumbnailViewModel?.image?.sources || [];
                tracks.push({
                  id: l.contentId,
                  title: l.metadata?.lockupMetadataViewModel?.title?.content || "",
                  channel: l.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || "",
                  thumb: thumbs[thumbs.length - 1]?.url || "",
                });
              }
            }
            res.end(JSON.stringify(tracks));
            return;
          }

          next();
        } catch (err: any) {
          console.error("Internal API error:", err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || "Error interno al buscar" }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), youtubeApiPlugin()],
});
