import { useEffect, useRef, useState } from "react";
import "./artist.css";

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady?: () => void }
}

type Track = { id: string; title: string; channel: string; thumb: string };
type Album = { id: string; title: string; thumb: string };
type Channel = { id: string; name: string; avatar: string; banner?: string; subs?: number; subsText?: string };
type Artist = { channel: Channel; top: Track[]; albums: Album[] };
type View = "search" | "liked" | "album";

type RecentItem = {
  id: string;
  type: "artist" | "track" | "album";
  title: string;
  subtitle: string;
  thumb: string;
  query?: string;
  track?: Track;
  album?: Album;
};

const EXPLORE_GENRES = [
  { id: "gen_reg", title: "Reggaetón", color: "#e1118c", query: "reggaeton 2024" },
  { id: "gen_trap", title: "Trap Latino", color: "#ba5d07", query: "trap latino" },
  { id: "gen_hits", title: "Éxitos", color: "#8d67ab", query: "exitos del momento" },
  { id: "gen_pop", title: "Pop en Español", color: "#006450", query: "pop en español" },
  { id: "gen_salsa", title: "Salsa", color: "#dc148c", query: "salsa exitos" },
  { id: "gen_lofi", title: "Lofi", color: "#1e3264", query: "lofi hip hop radio" },
  { id: "gen_rock", title: "Rock Clásico", color: "#e91429", query: "rock clasico" },
  { id: "gen_cumbia", title: "Cumbia", color: "#503750", query: "cumbia peruana" },
];

const RECOMMENDATIONS = [
  {
    id: "rec_reggaeton",
    title: "Reggaetón 2024",
    desc: "Los mayores éxitos de Anuel AA, Bad Bunny, Feid y Rauw Alejandro.",
    query: "reggaeton 2024 exitos",
    thumb: "https://i.ytimg.com/vi/TmKh7lAwnBI/hqdefault.jpg",
  },
  {
    id: "rec_trap",
    title: "Trap Latino",
    desc: "Clásicos y barras de Anuel, Noriel, Arcángel y Bad Bunny.",
    query: "trap latino clasicos",
    thumb: "https://i.ytimg.com/vi/qha3aJQ5ork/hqdefault.jpg",
  },
  {
    id: "rec_hits",
    title: "Éxitos del Momento",
    desc: "Las canciones que lideran las listas en todo el mundo hoy.",
    query: "exitos del momento 2024",
    thumb: "https://i.ytimg.com/vi/1vVHsmUv5zU/hqdefault.jpg",
  },
  {
    id: "rec_salsa",
    title: "Salsa Dura",
    desc: "Lo mejor de la salsa clásica y brava de todos los tiempos.",
    query: "salsa clasica exitos",
    thumb: "https://i.ytimg.com/vi/HbvsF1-MtM8/hqdefault.jpg",
  },
  {
    id: "rec_pop",
    title: "Pop en Español",
    desc: "Canciones pop inolvidables y las baladas más escuchadas.",
    query: "pop en español exitos",
    thumb: "https://i.ytimg.com/vi/OCoARtAdv3A/hqdefault.jpg",
  },
  {
    id: "rec_lofi",
    title: "Lofi para Estudiar",
    desc: "Beats relajantes sin letra para concentrarte y trabajar.",
    query: "lofi hip hop radio beats to relax study to",
    thumb: "https://i.ytimg.com/vi/l98_AtL6paA/hqdefault.jpg",
  },
];

const decode = (s: string) => { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; };
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function parseTrackMeta(rawTitle: string, rawChannel: string) {
  let title = decode(rawTitle)
    .replace(/\s*[\(\[](video oficial|official video|video lírico|video lirico|audio oficial|official audio|audio|letra|lyrics|visualizer|clip oficial|video clip|4k|hd|remix|ft\.[^\)\]]+|feat\.[^\)\]]+)[\)\]]/gi, "")
    .trim();

  let artist = decode(rawChannel).replace(/ - Topic$/i, "").trim();

  if (title.includes(" - ")) {
    const parts = title.split(" - ");
    const potentialArtist = parts[0].trim();
    const potentialTitle = parts.slice(1).join(" - ").trim();
    if (potentialTitle) {
      title = potentialTitle;
      artist = potentialArtist || artist;
    }
  }

  return { title, artist };
}

// Iconos vectoriales estilo Spotify
const SvgPlay = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const SvgPause = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const SvgPrev = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>;
const SvgNext = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>;
const SvgShuffle = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>;
const SvgRepeat = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>;
const SvgHeart = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill={on ? "#1ed760" : "none"} stroke={on ? "#1ed760" : "currentColor"} strokeWidth="2">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);
const SvgVolume = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    {muted ? (
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    ) : (
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    )}
  </svg>
);
const SvgExpand = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>;
const SvgCompress = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>;
const SvgDisc = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>;
const SvgVideo = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm6 3v6l5-3-5-3z"/></svg>;
const SvgUser = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>;
const SvgMic = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>;
const SvgMore = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>;
const SvgHome = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>;
const SvgSearch = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>;
const SvgLibrary = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>;
const SvgInstallApp = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12v5h-2.5l3.5 4 3.5-4H13V8h-2z"/>
  </svg>
);
const SvgBell = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
  </svg>
);
const SvgExternal = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
  </svg>
);
const SvgPlus = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
);
const SvgDevice = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm0 2v8h16V8H4zm7 11h2v2h-2z"/>
  </svg>
);
const SvgCheckCircle = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="#1ed760">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);
const SvgChevronDown = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
  </svg>
);
const SvgPlusCircle = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 8v8m-4-4h8"/>
  </svg>
);
const SvgShare = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8m-4-6l-4-4-4 4m4-4v13"/>
  </svg>
);
const SvgQueue = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h12v2H3v-2zm14-1v6l5-3-5-3z"/>
  </svg>
);

const videoSearch = async (term: string): Promise<Track[]> => {
  const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
  if (!r.ok) return [];
  const data = await r.json();
  return (data || []).map((i: any) => {
    const meta = parseTrackMeta(i.title, i.channel);
    return { id: i.id, title: meta.title, channel: meta.artist, thumb: i.thumb };
  });
};

async function findArtist(q: string): Promise<Artist | null> {
  const r = await fetch(`/api/artist?q=${encodeURIComponent(q)}`);
  if (!r.ok) return null;
  const j = await r.json();
  if (!j || !j.artist) return null;
  return {
    channel: j.artist.channel,
    top: (j.artist.top || []).map((i: any) => {
      const meta = parseTrackMeta(i.title, i.channel);
      return { id: i.id, title: meta.title, channel: meta.artist, thumb: i.thumb };
    }),
    albums: (j.artist.albums || []).filter((a: any) => a.title && a.thumb && a.thumb.startsWith("http")),
  };
}

async function loadAlbum(a: Album): Promise<Track[]> {
  const r = await fetch(`/api/playlist?id=${encodeURIComponent(a.id)}`);
  if (!r.ok) return [];
  const data = await r.json();
  return (data || []).map((i: any) => {
    const meta = parseTrackMeta(i.title, i.channel);
    return { id: i.id, title: meta.title, channel: meta.artist, thumb: i.thumb };
  });
}

export default function App() {
  const [view, setView] = useState<View>("search");
  const [q, setQ] = useState("");
  const [artist, setArtist] = useState<Artist | null>(null);
  const [results, setResults] = useState<Track[]>([]);
  const [album, setAlbum] = useState<{ a: Album; tracks: Track[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [homeFilter, setHomeFilter] = useState<"todo" | "musica" | "artistas" | "albumes">("todo");
  const [libFilter, setLibFilter] = useState<"todos" | "listas" | "artistas">("todos");
  const [mobileTab, setMobileTab] = useState<"home" | "search" | "library">("home");
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem("yt_username") || "Carlos");
  const [userInitial, setUserInitial] = useState(() => (localStorage.getItem("yt_username") || "Carlos").charAt(0).toUpperCase());
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const [bgTop, setBgTop] = useState("#78290f");
  const [bgBottom, setBgBottom] = useState("#401407");
  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const cache = useRef(new Map<string, { artist: Artist | null; results: Track[] }>());

  const [liked, setLiked] = useState<Track[]>(() => {
    try { return JSON.parse(localStorage.getItem("liked") ?? "[]"); } catch { return []; }
  });

  const [recents, setRecents] = useState<RecentItem[]>(() => {
    try {
      const stored = localStorage.getItem("yt_recents_v2");
      if (!stored) return [];
      const parsed: RecentItem[] = JSON.parse(stored);
      // Eliminar elementos cargados de ejemplo que empezaban con 'rec_'
      return Array.isArray(parsed) ? parsed.filter((item) => !item.id.startsWith("rec_")) : [];
    } catch {
      return [];
    }
  });

  const [queue, setQueue] = useState<Track[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(70);
  const seeking = useRef(false);
  const player = useRef<any>(null);
  const nextRef = useRef<() => void>(() => {});
  const prevRef = useRef<() => void>(() => {});
  const userPausedRef = useRef(false);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  const current = queue[idx];
  const currentRef = useRef(current);
  currentRef.current = current;
  const isLiked = (id: string) => liked.some((t) => t.id === id);

  const fallbackListenNow: Track[] = [
    {
      id: "ayer_anuel",
      title: "Ayer",
      channel: "DJ Nelson y Anuel AA",
      thumb: "https://i.ytimg.com/vi/OCoARtAdv3A/hqdefault.jpg",
    },
    {
      id: "47_remix",
      title: "47 - Remix",
      channel: "Anuel AA, Ñengo Flow, Sinfonico,...",
      thumb: "https://i.ytimg.com/vi/qha3aJQ5ork/hqdefault.jpg",
    },
  ];

  const listenNowTracks: Track[] = (
    recents.filter((x) => x.type === "track" && x.track).map((x) => x.track!)
  ).slice(0, 4);

  const listenNowList = listenNowTracks.length > 0 ? listenNowTracks : fallbackListenNow;

  const addRecent = (item: RecentItem) => {
    setRecents((prev) => {
      const filtered = prev.filter((x) => x.id !== item.id && x.title.toLowerCase() !== item.title.toLowerCase());
      const updated = [item, ...filtered].slice(0, 24);
      try { localStorage.setItem("yt_recents_v2", JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const next = () => {
    if (repeatRef.current) {
      player.current?.seekTo(0, true);
      player.current?.playVideo();
      return;
    }
    if (shuffleRef.current && queue.length > 1) {
      let rand = Math.floor(Math.random() * queue.length);
      if (rand === idx) rand = (idx + 1) % queue.length;
      setIdx(rand);
      return;
    }
    if (idx < queue.length - 1) setIdx(idx + 1);
  };
  const prev = () => { if (pos > 4 || idx === 0) player.current?.seekTo(0, true); else setIdx(idx - 1); };
  nextRef.current = next;
  prevRef.current = prev;

  // Audio Keeper en segundo plano (Móvil / PWA)
  useEffect(() => {
    // 1 segundo de silencio WAV en base64 para mantener activo el canal de audio del navegador móvil
    const silentWav = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    const audio = new Audio(silentWav);
    audio.loop = true;
    audio.volume = 0.001;
    silentAudioRef.current = audio;

    return () => {
      audio.pause();
      silentAudioRef.current = null;
    };
  }, []);

  // Sincronizar MediaSession API para controles en pantalla de bloqueo y barra de notificaciones
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    if (current) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: current.title,
          artist: current.channel,
          album: "Spotify Web",
          artwork: [
            { src: current.thumb, sizes: "96x96", type: "image/jpeg" },
            { src: current.thumb, sizes: "128x128", type: "image/jpeg" },
            { src: current.thumb, sizes: "192x192", type: "image/jpeg" },
            { src: current.thumb, sizes: "256x256", type: "image/jpeg" },
            { src: current.thumb, sizes: "384x384", type: "image/jpeg" },
            { src: current.thumb, sizes: "512x512", type: "image/jpeg" },
          ],
        });
      } catch {}
    }

    try {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
      navigator.mediaSession.setActionHandler("play", () => {
        userPausedRef.current = false;
        silentAudioRef.current?.play().catch(() => {});
        player.current?.playVideo?.();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        userPausedRef.current = true;
        silentAudioRef.current?.pause();
        player.current?.pauseVideo?.();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        prevRef.current();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        nextRef.current();
      });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime != null && player.current?.seekTo) {
          player.current.seekTo(details.seekTime, true);
          setPos(details.seekTime);
        }
      });
    } catch (e) {
      console.warn("MediaSession handler error:", e);
    }
  }, [current?.id, current?.title, current?.channel, current?.thumb, playing]);

  // Listener para mantener la reproducción cuando se cambia de pestaña o se minimiza en móvil
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!userPausedRef.current && player.current?.getPlayerState?.() === 2) {
          player.current?.playVideo?.();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Extracción del color del álbum para crear el degradado de Spotify
  useEffect(() => {
    if (!current?.thumb) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      try {
        const cvs = document.createElement("canvas");
        cvs.width = 16;
        cvs.height = 16;
        const ctx = cvs.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 16, 16);
        const { data } = ctx.getImageData(0, 0, 16, 16);
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2];
          const max = Math.max(pr, pg, pb);
          const min = Math.min(pr, pg, pb);
          const sat = max === 0 ? 0 : (max - min) / max;
          const weight = 1 + sat * 2;
          r += pr * weight;
          g += pg * weight;
          b += pb * weight;
          count += weight;
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        const topR = Math.min(185, Math.max(50, r));
        const topG = Math.min(185, Math.max(25, g));
        const topB = Math.min(185, Math.max(20, b));

        const btmR = Math.round(topR * 0.42);
        const btmG = Math.round(topG * 0.42);
        const btmB = Math.round(topB * 0.42);

        setBgTop(`rgb(${topR}, ${topG}, ${topB})`);
        setBgBottom(`rgb(${btmR}, ${btmG}, ${btmB})`);
      } catch {
        setBgTop("#78290f");
        setBgBottom("#401407");
      }
    };
    img.onerror = () => {
      setBgTop("#78290f");
      setBgBottom("#401407");
    };
    img.src = current.thumb;
  }, [current?.id, current?.thumb]);

  useEffect(() => {
    const init = () => {
      player.current = new window.YT.Player("yt", {
        width: "100%",
        height: "100%",
        playerVars: {
          playsinline: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          autoplay: 1,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: () => {
            setReady(true);
            if (currentRef.current) {
              player.current.loadVideoById(currentRef.current.id);
            }
          },
          onStateChange: (e: any) => {
            const isPlay = e.data === 1;
            setPlaying(isPlay);
            if (isPlay) {
              userPausedRef.current = false;
              silentAudioRef.current?.play().catch(() => {});
            }
            if (e.data === 0) nextRef.current();

            // Si el navegador móvil pausó automáticamente el audio al cambiar de app o bloquear pantalla:
            if (e.data === 2 && document.visibilityState === "hidden" && !userPausedRef.current) {
              setTimeout(() => {
                if (!userPausedRef.current && player.current?.playVideo) {
                  player.current.playVideo();
                }
              }, 300);
            }
          },
          onError: (e: any) => {
            console.warn("YouTube Player error:", e.data);
            nextRef.current();
          },
        },
      });
    };
    if (window.YT?.Player) init();
    else {
      window.onYouTubeIframeAPIReady = init;
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
    return () => player.current?.destroy?.();
  }, []);

  useEffect(() => { if (ready && current) player.current.loadVideoById(current.id); }, [current?.id, ready]);
  useEffect(() => { if (ready) player.current.setVolume(vol); }, [vol, ready]);
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      if (seeking.current) return;
      setPos(player.current.getCurrentTime?.() ?? 0);
      setDur(player.current.getDuration?.() ?? 0);
    }, 500);
    return () => clearInterval(t);
  }, [ready]);
  useEffect(() => { localStorage.setItem("liked", JSON.stringify(liked)); }, [liked]);

  useEffect(() => {
    // Limpiar caché antiguo de búsquedas de la API previa y quitar ejemplos iniciales
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("yt_cache_")) localStorage.removeItem(k);
      });
      const stored = localStorage.getItem("yt_recents_v2");
      if (stored) {
        const parsed: RecentItem[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((item) => !item.id.startsWith("rec_"));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem("yt_recents_v2", JSON.stringify(cleaned));
            setRecents(cleaned);
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
        setShowMenu(false);
        setShowNotifs(false);
        setShowProfileModal(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  const search = async (term: string) => {
    term = term.trim();
    if (!term) return;
    setQ(term); setView("search"); setError("");

    const hit = cache.current.get(term.toLowerCase());
    if (hit) { setArtist(hit.artist); setResults(hit.results); return; }

    setLoading(true);
    try {
      const [a, r] = await Promise.all([
        findArtist(term),
        videoSearch(term),
      ]);
      const data = { artist: a, results: r };
      cache.current.set(term.toLowerCase(), data);
      setArtist(a); setResults(r);

      // Si se encontró un artista, guardarlo en el historial de recientes
      if (a) {
        addRecent({
          id: "art_" + a.channel.name.toLowerCase(),
          type: "artist",
          title: a.channel.name,
          subtitle: "Artista",
          thumb: a.channel.avatar,
          query: a.channel.name,
        });
      }
    } catch (e) {
      setError((e as Error).message || "Error al realizar la búsqueda");
    }
    finally { setLoading(false); }
  };

  const openAlbum = async (a: Album) => {
    setLoading(true); setError("");
    try {
      const tracks = await loadAlbum(a);
      setAlbum({ a, tracks });
      setView("album");

      addRecent({
        id: "alb_" + a.id,
        type: "album",
        title: a.title,
        subtitle: "Álbum",
        thumb: a.thumb,
        album: a,
      });
    }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const play = (list: Track[], i = 0) => {
    if (list.length) {
      const t = list[i];
      setQueue(list);
      setIdx(i);
      userPausedRef.current = false;
      silentAudioRef.current?.play().catch(() => {});

      // En PC / Desktop NO expandir a pantalla completa automáticamente:
      // la música suena directamente en la barra inferior de Spotify mientras se navega.
      // En móvil (<= 768px) sí se abre a pantalla completa.
      if (typeof window !== "undefined" && window.innerWidth <= 768) {
        setExpanded(true);
      } else {
        setExpanded(false);
      }

      // Iniciar reproducción sincrónica en el evento de click (política de autoplay)
      if (player.current?.loadVideoById) {
        player.current.loadVideoById(t.id);
        player.current.playVideo?.();
      }

      // Guardar en recientes la canción reproducida
      addRecent({
        id: "track_" + t.id,
        type: "track",
        title: t.title,
        subtitle: t.channel,
        thumb: t.thumb,
        track: t,
      });
    }
  };

  const handleRecentClick = (item: RecentItem) => {
    if (item.type === "artist") {
      // Redirigir directamente al perfil del artista
      search(item.query || item.title);
    } else if (item.type === "track") {
      // Reproducir la canción inmediatamente
      if (item.track) {
        play([item.track], 0);
      } else {
        setLoading(true);
        videoSearch(item.query || item.title).then((tracks) => {
          if (tracks.length > 0) {
            play(tracks, 0);
          } else {
            search(item.query || item.title);
          }
        }).finally(() => setLoading(false));
      }
    } else if (item.type === "album") {
      if (item.album) {
        openAlbum(item.album);
      } else {
        search(item.query || item.title);
      }
    } else {
      search(item.query || item.title);
    }
  };

  const toggle = () => {
    if (playing) {
      userPausedRef.current = true;
      silentAudioRef.current?.pause();
      player.current?.pauseVideo();
    } else {
      userPausedRef.current = false;
      silentAudioRef.current?.play().catch(() => {});
      player.current?.playVideo();
    }
  };
  const toggleLike = (t: Track) =>
    setLiked((l) => (l.some((x) => x.id === t.id) ? l.filter((x) => x.id !== t.id) : [t, ...l]));

  const renderTracks = (list: Track[]) => (
    <ul className="tracks">
      {list.map((t, i) => (
        <li key={t.id + i} className={current?.id === t.id ? "active" : ""}>
          <button className="row" onClick={() => play(list, i)}>
            <img src={t.thumb} alt="" referrerPolicy="no-referrer" />
            <span className="meta"><b>{t.title}</b><small>{t.channel}</small></span>
          </button>
          <button className={"heart" + (isLiked(t.id) ? " on" : "")} onClick={() => toggleLike(t)}
            aria-label={isLiked(t.id) ? "Quitar de me gusta" : "Guardar en me gusta"}>
            <SvgHeart on={isLiked(t.id)} />
          </button>
        </li>
      ))}
    </ul>
  );

  const subs = artist?.channel.subs;
  const empty = !artist && results.length === 0 && !loading;
  const progressPct = dur > 0 ? (pos / dur) * 100 : 0;

  // Filtrado de las 8 tarjetas rápidas
  const filteredRecents = recents.filter((item) => {
    if (homeFilter === "artistas") return item.type === "artist";
    if (homeFilter === "albumes") return item.type === "album";
    if (homeFilter === "musica") return item.type === "track";
    return true;
  }).slice(0, 8);

  // Filtrado de la biblioteca lateral
  const sidebarItems = recents.filter((item) => {
    if (libFilter === "artistas") return item.type === "artist";
    if (libFilter === "listas") return item.type === "album" || item.type === "track";
    return true;
  });

  return (
    <div className="app">
      {/* Barra lateral Tu biblioteca estilo Spotify */}
      <aside className="side">
        <div className="lib-header">
          <button className="lib-title-btn" onClick={() => { setQ(""); setArtist(null); setResults([]); setView("search"); }}>
            <SvgLibrary />
            <span>Tu biblioteca</span>
          </button>
          <button className="lib-add-btn" title="Buscar" onClick={() => setView("search")}>+</button>
        </div>

        <div className="lib-pills">
          <button className={"filter-pill" + (libFilter === "todos" ? " active" : "")} onClick={() => setLibFilter("todos")}>Todos</button>
          <button className={"filter-pill" + (libFilter === "listas" ? " active" : "")} onClick={() => setLibFilter("listas")}>Listas</button>
          <button className={"filter-pill" + (libFilter === "artistas" ? " active" : "")} onClick={() => setLibFilter("artistas")}>Artistas</button>
        </div>

        <div className="lib-list">
          {/* Tarjeta Canciones que te gustan */}
          <div
            className={"lib-item" + (view === "liked" ? " active" : "")}
            onClick={() => setView("liked")}
          >
            <div className="lib-item-icon liked">
              <SvgHeart on={true} />
            </div>
            <div className="lib-item-info">
              <b>Canciones que te gustan</b>
              <small>📌 Lista • {liked.length} canciones</small>
            </div>
          </div>

          {/* Lista de escuchados recientemente en la barra lateral */}
          {sidebarItems.map((item) => (
            <div
              key={item.id}
              className="lib-item"
              onClick={() => handleRecentClick(item)}
              title={item.type === "artist" ? `Ver perfil de ${item.title}` : `Reproducir ${item.title}`}
            >
              <img
                src={item.thumb}
                alt=""
                className={item.type === "artist" ? "artist" : ""}
                referrerPolicy="no-referrer"
              />
              <div className="lib-item-info">
                <b>{item.title}</b>
                <small>{item.subtitle}</small>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="main">
        {/* Header para móviles */}
        <div className="mobile-header">
          {mobileTab === "home" && (
            <div className="mobile-top-bar">
              <button
                className="user-avatar-btn mobile-avatar"
                onClick={() => { setShowMenu(!showMenu); setShowNotifs(false); }}
                title={`Cuenta de ${userName}`}
                aria-label="Cuenta"
              >
                <span className="user-avatar-circle">{userInitial}</span>
              </button>

              <div className="mobile-filter-pills">
                <button
                  className={"filter-pill" + (homeFilter === "todo" ? " active" : "")}
                  onClick={() => setHomeFilter("todo")}
                >
                  Todas
                </button>
                <button
                  className={"filter-pill" + (homeFilter === "musica" ? " active" : "")}
                  onClick={() => setHomeFilter("musica")}
                >
                  Música
                </button>
                <button
                  className={"filter-pill" + (homeFilter === "artistas" ? " active" : "")}
                  onClick={() => setHomeFilter("artistas")}
                >
                  Podcasts
                </button>
                <button
                  className={"filter-pill" + (homeFilter === "albumes" ? " active" : "")}
                  onClick={() => setHomeFilter("albumes")}
                >
                  Audiolibros
                </button>
              </div>
            </div>
          )}

          {mobileTab === "search" && (
            <div className="mobile-search-bar-wrap">
              <form className="mobile-search-box" onSubmit={(e) => { e.preventDefault(); search(q); }}>
                <SvgSearch />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="¿Qué quieres escuchar?"
                  aria-label="Buscar"
                />
                {q && (
                  <button
                    type="button"
                    className="mobile-clear-btn"
                    onClick={() => { setQ(""); setResults([]); setArtist(null); }}
                  >
                    ✕
                  </button>
                )}
              </form>
            </div>
          )}

          {mobileTab === "library" && (
            <div className="mobile-lib-header">
              <button
                className="user-avatar-btn mobile-avatar"
                onClick={() => { setShowMenu(!showMenu); setShowNotifs(false); }}
                title={`Cuenta de ${userName}`}
                aria-label="Cuenta"
              >
                <span className="user-avatar-circle">{userInitial}</span>
              </button>
              <h2>Tu biblioteca</h2>
              <button className="lib-add-btn" onClick={() => setMobileTab("search")}>+</button>
            </div>
          )}
        </div>

        {/* Barra superior Desktop con botón de inicio, buscador y acceso a cuenta */}
        <div className="top-nav desktop-only">
          <div className="top-nav-left">
            <button
              className="home-btn"
              onClick={() => { setQ(""); setArtist(null); setResults([]); setAlbum(null); setView("search"); }}
              title="Inicio"
            >
              <SvgHome />
            </button>

            <form className="searchbar-box" onSubmit={(e) => { e.preventDefault(); search(q); }}>
              <SvgSearch />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="¿Qué quieres reproducir?"
                aria-label="Buscar"
              />
            </form>
          </div>

          <div className="top-nav-right">
            <button
              className="install-app-btn"
              onClick={() => alert("¡Spotify Web está instalado y listo para usar en tu navegador!")}
              title="Instalar app"
            >
              <SvgInstallApp />
              <span>Instalar app</span>
            </button>

            <div className="notif-wrapper" ref={notifRef}>
              <button
                className="notif-btn"
                onClick={() => { setShowNotifs(!showNotifs); setShowMenu(false); }}
                title="Novedades"
                aria-label="Novedades"
              >
                <SvgBell />
                <span className="notif-badge" />
              </button>

              {showNotifs && (
                <div className="spotify-dropdown notif-dropdown">
                  <div className="dropdown-header">Novedades</div>
                  <div className="notif-item">
                    <b>Anuel AA & Trap Latino</b>
                    <small>Catálogo y álbumes cargados en alta calidad.</small>
                  </div>
                  <div className="notif-item">
                    <b>Búsquedas ilimitadas</b>
                    <small>Acceso directo sin límites de cuota de YouTube.</small>
                  </div>
                </div>
              )}
            </div>

            <div className="user-menu-wrapper" ref={menuRef}>
              <button
                className="user-avatar-btn"
                onClick={() => { setShowMenu(!showMenu); setShowNotifs(false); }}
                title={`Cuenta de ${userName}`}
                aria-label="Menú de cuenta"
              >
                <span className="user-avatar-circle">{userInitial}</span>
              </button>

              {showMenu && (
                <div className="spotify-dropdown user-dropdown">
                  <button
                    className="dropdown-item"
                    onClick={() => { setShowProfileModal(true); setShowMenu(false); }}
                  >
                    <span>Cuenta</span>
                    <SvgExternal />
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => { setShowProfileModal(true); setShowMenu(false); }}
                  >
                    <span>Perfil</span>
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      alert("Ya cuentas con Plan Ilimitado sin interrupciones.");
                      setShowMenu(false);
                    }}
                  >
                    <span>Mejorar tu cuenta</span>
                    <SvgExternal />
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => { setShowProfileModal(true); setShowMenu(false); }}
                  >
                    <span>Configuración</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      if (confirm("¿Cerrar sesión y reiniciar historial?")) {
                        localStorage.removeItem("yt_recents_v2");
                        window.location.reload();
                      }
                    }}
                  >
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <p className="msg err">{error}</p>}
        {loading && <p className="msg">Cargando…</p>}

        {/* Vista Móvil: Tu biblioteca */}
        {mobileTab === "library" && view === "search" && (
          <section className="mobile-library-section">
            <div className="lib-pills" style={{ margin: "4px 0 16px" }}>
              <button className={"filter-pill" + (libFilter === "todos" ? " active" : "")} onClick={() => setLibFilter("todos")}>Todos</button>
              <button className={"filter-pill" + (libFilter === "listas" ? " active" : "")} onClick={() => setLibFilter("listas")}>Listas</button>
              <button className={"filter-pill" + (libFilter === "artistas" ? " active" : "")} onClick={() => setLibFilter("artistas")}>Artistas</button>
            </div>
            <div className="lib-list">
              <div className="lib-item" onClick={() => setView("liked")}>
                <div className="lib-item-icon liked"><SvgHeart on={true} /></div>
                <div className="lib-item-info">
                  <b>Canciones que te gustan</b>
                  <small>📌 Lista • {liked.length} canciones</small>
                </div>
              </div>
              {sidebarItems.map((item) => (
                <div key={item.id} className="lib-item" onClick={() => handleRecentClick(item)}>
                  <img src={item.thumb} alt="" className={item.type === "artist" ? "artist" : ""} referrerPolicy="no-referrer" />
                  <div className="lib-item-info">
                    <b>{item.title}</b>
                    <small>{item.subtitle}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Vista Móvil: Explorar géneros en pestaña Buscar cuando no hay búsqueda activa */}
        {mobileTab === "search" && empty && (
          <section className="mobile-explore-section">
            <div className="section-head">
              <h2>Explorar todo</h2>
            </div>
            <div className="explore-grid">
              {EXPLORE_GENRES.map((g) => (
                <div
                  key={g.id}
                  className="genre-tile"
                  style={{ backgroundColor: g.color }}
                  onClick={() => search(g.query)}
                >
                  <span>{g.title}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {view === "search" && (mobileTab === "home" || !empty) && (
          <>
            {empty && (
              <section>
                {/* Cuadrícula de 8 accesos directos (2 columnas x 4 filas) */}
                {filteredRecents.length > 0 && (
                  <div className="quick-grid">
                    {filteredRecents.map((item) => (
                      <div
                        key={item.id}
                        className="quick-card"
                        onClick={() => handleRecentClick(item)}
                        title={item.type === "artist" ? `Ir al perfil de ${item.title}` : `Reproducir ${item.title}`}
                      >
                        <img
                          src={item.thumb}
                          alt=""
                          className={"quick-card-img" + (item.type === "artist" ? " artist" : "")}
                          referrerPolicy="no-referrer"
                        />
                        <span className="quick-card-title">{item.title}</span>
                        <button
                          className="quick-card-play"
                          onClick={(e) => { e.stopPropagation(); handleRecentClick(item); }}
                          aria-label="Reproducir"
                        >
                          <SvgPlay />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sección Escuchar ahora exacta a la captura del usuario */}
                <div className="section-head-stacked">
                  <small className="section-sub">Explora una sesión basada en tus gustos musicales</small>
                  <h2>Escuchar ahora</h2>
                </div>

                <div className="listen-now-list">
                  {listenNowList.map((t) => (
                    <div
                      key={t.id}
                      className="listen-now-item"
                      onClick={() => play([t], 0)}
                    >
                      <img src={t.thumb} alt="" referrerPolicy="no-referrer" />
                      <div className="listen-now-info">
                        <b>{t.title}</b>
                        <small>
                          <span className="explicit-badge">E</span> {t.channel}
                        </small>
                      </div>
                      <button
                        className="more-btn"
                        onClick={(e) => { e.stopPropagation(); toggleLike(t); }}
                        aria-label="Opciones"
                      >
                        <SvgMore />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Sección Sigue reproduciendo (carousel horizontal en móviles) */}
                <div className="section-head">
                  <h2>Sigue reproduciendo</h2>
                </div>

                <div className="recommend-grid">
                  {RECOMMENDATIONS.map((r) => (
                    <div
                      key={r.id}
                      className="recommend-card"
                      onClick={() => search(r.query)}
                      title={`Escuchar ${r.title}`}
                    >
                      <div className="recommend-thumb-box">
                        <img src={r.thumb} alt={r.title} referrerPolicy="no-referrer" />
                        <button className="recommend-play" aria-label="Reproducir">
                          <SvgPlay />
                        </button>
                      </div>
                      <b>{r.title}</b>
                      <small>{r.desc}</small>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {artist && (
              <section className="hero" style={artist.channel.banner ? { backgroundImage: `url(${artist.channel.banner})` } : undefined}>
                <img className="avatar" src={artist.channel.avatar} alt={artist.channel.name} referrerPolicy="no-referrer" />
                <div>
                  <h2>{artist.channel.name}</h2>
                  <p>{artist.channel.subsText ? `${artist.channel.subsText} suscriptores en YouTube` : subs ? `${new Intl.NumberFormat("es", { notation: "compact" }).format(subs)} suscriptores en YouTube` : "Artista"}</p>
                  <button className="big" onClick={() => play(artist.top)} aria-label="Reproducir populares">▶</button>
                </div>
              </section>
            )}

            {artist && artist.top.length > 0 && (<section><h2>Populares</h2>{renderTracks(artist.top)}</section>)}

            {artist && artist.albums.length > 0 && (
              <section>
                <h2>Álbumes</h2>
                <div className="albums">
                  {artist.albums.map((a) => (
                    <button key={a.id} className="album" onClick={() => openAlbum(a)}>
                      <img src={a.thumb} alt="" referrerPolicy="no-referrer" /><b>{a.title}</b>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {results.length > 0 && (<section><h2>{artist ? "Más canciones" : "Resultados"}</h2>{renderTracks(results)}</section>)}
          </>
        )}

        {view === "album" && album && (
          <section>
            <button className="back" onClick={() => setView("search")}>‹ Volver</button>
            <div className="albumhead">
              <img src={album.a.thumb} alt="" referrerPolicy="no-referrer" />
              <div>
                <h2>{album.a.title}</h2>
                <p>{artist?.channel.name || "Álbum"} · {album.tracks.length} canciones</p>
                <button className="big" onClick={() => play(album.tracks)} aria-label="Reproducir álbum">▶</button>
              </div>
            </div>
            {album.tracks.length ? renderTracks(album.tracks) : <p className="msg">Este álbum no tiene canciones disponibles.</p>}
          </section>
        )}

        {view === "liked" && (
          <section>
            <h2>Canciones que me gustan</h2>
            {liked.length ? renderTracks(liked) : <p className="msg">Aún no tienes canciones guardadas. Toca el corazón en cualquier canción.</p>}
          </section>
        )}
      </main>

      {/* Pantalla completa de reproducción idéntica a Spotify Mobile (Solo móvil) */}
      {typeof window !== "undefined" && window.innerWidth <= 768 && expanded && current && (
        <section
          className="now-playing-screen mobile-only"
          style={{
            ["--bg-top" as any]: bgTop,
            ["--bg-bottom" as any]: bgBottom,
          }}
        >
          {/* Barra superior del reproductor móvil */}
          <div className="player-top-bar">
            <button
              className="player-icon-btn"
              onClick={() => setExpanded(false)}
              aria-label="Minimizar"
              title="Minimizar"
            >
              <SvgChevronDown />
            </button>
            <div className="player-context">
              <small>REPRODUCIENDO DESDE ARTISTA</small>
              <b>{current.channel || "Música"}</b>
            </div>
            <button className="player-icon-btn" aria-label="Opciones" title="Opciones">
              <SvgMore />
            </button>
          </div>

          <div className="player-scroll-content">
            {/* Portada grande con bordes redondeados y sombra */}
            <div className="player-artwork-box">
              <img src={current.thumb} alt={current.title} referrerPolicy="no-referrer" />
            </div>

            {/* Botón Cambiar a video */}
            <div className="player-switch-video">
              <button
                className="switch-video-btn"
                onClick={() => alert("Modo video activado.")}
              >
                <SvgVideo />
                <span>Cambiar a video</span>
              </button>
            </div>

            {/* Metadatos: Título grande, Artista con badge [E] y botón (+) */}
            <div className="player-track-meta">
              <div className="meta-left">
                <h2 className="player-track-title">{current.title}</h2>
                <div className="player-track-sub">
                  <span className="explicit-badge">E</span>
                  <span>{current.channel}</span>
                </div>
              </div>
              <button
                className={"player-like-btn" + (isLiked(current.id) ? " on" : "")}
                onClick={() => toggleLike(current)}
                aria-label={isLiked(current.id) ? "Guardado en biblioteca" : "Añadir a biblioteca"}
              >
                {isLiked(current.id) ? <SvgCheckCircle /> : <SvgPlusCircle />}
              </button>
            </div>

            {/* Barra de progreso con slider y tiempos actuales */}
            <div className="player-seek-container">
              <input
                type="range"
                className="spotify-slider player-slider"
                min={0}
                max={dur || 1}
                step={1}
                value={pos}
                style={{
                  background: `linear-gradient(to right, #ffffff 0%, #ffffff ${progressPct}%, #4d4d4d ${progressPct}%, #4d4d4d 100%)`,
                }}
                aria-label="Progreso"
                onMouseDown={() => (seeking.current = true)}
                onTouchStart={() => (seeking.current = true)}
                onChange={(e) => setPos(+e.target.value)}
                onMouseUp={(e) => { player.current?.seekTo(+(e.target as HTMLInputElement).value, true); seeking.current = false; }}
                onTouchEnd={(e) => { player.current?.seekTo(+(e.target as HTMLInputElement).value, true); seeking.current = false; }}
              />
              <div className="player-times">
                <span>{fmt(pos)}</span>
                <span>{fmt(dur)}</span>
              </div>
            </div>

            {/* Controles de reproducción con botón Play gigante blanco */}
            <div className="player-controls-row">
              <button
                className={"player-ctrl-sub" + (shuffle ? " on" : "")}
                onClick={() => setShuffle(!shuffle)}
                aria-label="Aleatorio"
              >
                <SvgShuffle />
              </button>
              <button className="player-ctrl-skip" onClick={prev} aria-label="Anterior">
                <SvgPrev />
              </button>
              <button className="player-play-large" onClick={toggle} aria-label={playing ? "Pausar" : "Reproducir"}>
                {playing ? <SvgPause /> : <SvgPlay />}
              </button>
              <button className="player-ctrl-skip" onClick={next} aria-label="Siguiente">
                <SvgNext />
              </button>
              <button
                className={"player-ctrl-sub" + (repeat ? " on" : "")}
                onClick={() => setRepeat(!repeat)}
                aria-label="Repetir"
              >
                <SvgRepeat />
              </button>
            </div>

            {/* Utilidades inferiores: Dispositivos, Compartir, Cola */}
            <div className="player-utility-row">
              <button className="player-util-btn" title="Dispositivos">
                <SvgDevice />
              </button>
              <div className="player-util-right">
                <button className="player-util-btn" title="Compartir">
                  <SvgShare />
                </button>
                <button className="player-util-btn" title="Cola de reproducción">
                  <SvgQueue />
                </button>
              </div>
            </div>

            {/* Tarjeta de previsualización de Letra en la parte inferior */}
            <div className="player-lyrics-card">
              <div className="lyrics-card-header">
                <b>Letra</b>
                <div className="lyrics-actions">
                  <button className="lyrics-icon-btn" title="Compartir letra"><SvgShare /></button>
                  <button className="lyrics-icon-btn" title="Expandir letra"><SvgExpand /></button>
                </div>
              </div>
              <p className="lyrics-preview-text">
                Disfruta de la mejor calidad de audio sin anuncios ni pausas.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Mini reproductor móvil flotante estilo Spotify */}
      {current && (
        <div
          className="mobile-mini-player"
          onClick={() => setExpanded(true)}
          style={{
            background: bgBottom ? `linear-gradient(90deg, ${bgBottom}, #141414)` : "#181818",
          }}
        >
          <div className="mini-player-body">
            <img src={current.thumb} alt="" referrerPolicy="no-referrer" />
            <div className="mini-meta">
              <b>{current.title}</b>
              <small>{current.channel}</small>
            </div>
            <button
              className="mini-ctrl-btn"
              onClick={(e) => { e.stopPropagation(); }}
              title="Dispositivos"
              aria-label="Dispositivos"
            >
              <SvgDevice />
            </button>
            <button
              className={"mini-ctrl-btn" + (isLiked(current.id) ? " liked" : "")}
              onClick={(e) => { e.stopPropagation(); toggleLike(current); }}
              title={isLiked(current.id) ? "Guardada" : "Guardar"}
              aria-label="Guardar"
            >
              {isLiked(current.id) ? <SvgCheckCircle /> : <SvgPlus />}
            </button>
            <button
              className="mini-play-btn"
              onClick={(e) => { e.stopPropagation(); toggle(); }}
              aria-label={playing ? "Pausar" : "Reproducir"}
            >
              {playing ? <SvgPause /> : <SvgPlay />}
            </button>
          </div>
          <div
            className="mini-progress-track"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Barra de navegación inferior móvil estilo Spotify */}
      <nav className="mobile-nav-bar">
        <button
          className={"mobile-nav-btn" + (mobileTab === "home" && view !== "liked" && view !== "album" ? " active" : "")}
          onClick={() => {
            setMobileTab("home");
            setView("search");
            setQ("");
            setArtist(null);
            setResults([]);
            setAlbum(null);
          }}
        >
          <SvgHome />
          <span>Inicio</span>
        </button>

        <button
          className={"mobile-nav-btn" + (mobileTab === "search" ? " active" : "")}
          onClick={() => {
            setMobileTab("search");
            setView("search");
          }}
        >
          <SvgSearch />
          <span>Buscar</span>
        </button>

        <button
          className={"mobile-nav-btn" + (mobileTab === "library" || view === "liked" ? " active" : "")}
          onClick={() => {
            setMobileTab("library");
          }}
        >
          <SvgLibrary />
          <span>Tu biblioteca</span>
        </button>

        <button
          className="mobile-nav-btn"
          onClick={() => {
            setView("liked");
            setMobileTab("library");
          }}
        >
          <SvgPlus />
          <span>Crear</span>
        </button>
      </nav>

      {/* Barra de reproducción inferior Desktop estilo Spotify */}
      <footer className="bar desktop-bar">
        <div className="now">
          {current ? (
            <>
              <img src={current.thumb} alt="" referrerPolicy="no-referrer" />
              <div className="meta">
                <b>{current.title}</b>
                <small>{current.channel}</small>
              </div>
              <button
                className={"like-btn" + (isLiked(current.id) ? " on" : "")}
                onClick={(e) => { e.stopPropagation(); toggleLike(current); }}
                aria-label="Me gusta"
                title={isLiked(current.id) ? "Quitar de me gusta" : "Guardar en me gusta"}
              >
                <SvgHeart on={isLiked(current.id)} />
              </button>
            </>
          ) : <span className="meta"><small>Elige una canción para empezar</small></span>}
        </div>

        <div className="ctrl">
          <div className="btns">
            <button
              className={"ctrl-btn" + (shuffle ? " on" : "")}
              onClick={() => setShuffle(!shuffle)}
              disabled={!current}
              title={shuffle ? "Desactivar aleatorio" : "Activar aleatorio"}
              aria-label="Aleatorio"
            >
              <SvgShuffle />
            </button>
            <button className="ctrl-btn" onClick={prev} disabled={!current} aria-label="Anterior">
              <SvgPrev />
            </button>
            <button className="ctrl-btn pp" onClick={toggle} disabled={!current} aria-label={playing ? "Pausar" : "Reproducir"}>
              {playing ? <SvgPause /> : <SvgPlay />}
            </button>
            <button className="ctrl-btn" onClick={next} disabled={!current || (!shuffle && idx >= queue.length - 1)} aria-label="Siguiente">
              <SvgNext />
            </button>
            <button
              className={"ctrl-btn" + (repeat ? " on" : "")}
              onClick={() => setRepeat(!repeat)}
              disabled={!current}
              title={repeat ? "Desactivar repetir" : "Repetir canción"}
              aria-label="Repetir"
            >
              <SvgRepeat />
            </button>
          </div>

          <div className="seek">
            <span>{fmt(pos)}</span>
            <input
              type="range"
              className="spotify-slider"
              min={0}
              max={dur || 1}
              step={1}
              value={pos}
              style={{
                background: `linear-gradient(to right, #ffffff 0%, #ffffff ${progressPct}%, #4d4d4d ${progressPct}%, #4d4d4d 100%)`,
              }}
              aria-label="Progreso"
              onMouseDown={() => (seeking.current = true)}
              onTouchStart={() => (seeking.current = true)}
              onChange={(e) => setPos(+e.target.value)}
              onMouseUp={(e) => { player.current?.seekTo(+(e.target as HTMLInputElement).value, true); seeking.current = false; }}
              onTouchEnd={(e) => { player.current?.seekTo(+(e.target as HTMLInputElement).value, true); seeking.current = false; }}
              onKeyUp={(e) => player.current?.seekTo(+(e.target as HTMLInputElement).value, true)}
            />
            <span>{fmt(dur)}</span>
          </div>
        </div>

        <div className="vol">
          <button className="ctrl-btn" onClick={() => setVol(vol === 0 ? 70 : 0)} title={vol === 0 ? "Activar sonido" : "Silenciar"}>
            <SvgVolume muted={vol === 0} />
          </button>
          <input
            type="range"
            className="spotify-slider"
            min={0}
            max={100}
            value={vol}
            style={{
              background: `linear-gradient(to right, #ffffff 0%, #ffffff ${vol}%, #4d4d4d ${vol}%, #4d4d4d 100%)`,
            }}
            onChange={(e) => setVol(+e.target.value)}
            aria-label="Volumen"
          />
        </div>
      </footer>

      {/* Modal de Información de Cuenta / Perfil */}
      {showProfileModal && (
        <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div className="modal-avatar">{userInitial}</div>
              <div>
                <span className="profile-badge">Perfil de usuario</span>
                <h2>{userName}</h2>
                <p className="profile-meta">Cuenta activa • Plan Premium Ilimitado</p>
              </div>
            </div>

            <div className="modal-body">
              <label>Nombre de cuenta</label>
              <div className="profile-name-edit">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserName(val);
                    setUserInitial(val.trim() ? val.trim().charAt(0).toUpperCase() : "C");
                    localStorage.setItem("yt_username", val);
                  }}
                  placeholder="Tu nombre de usuario"
                />
              </div>

              <div className="profile-stats">
                <div className="stat-card">
                  <b>{liked.length}</b>
                  <small>Canciones favoritas</small>
                </div>
                <div className="stat-card">
                  <b>{recents.length}</b>
                  <small>En biblioteca</small>
                </div>
                <div className="stat-card">
                  <b>Ilimitado</b>
                  <small>Sin límites de API</small>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setShowProfileModal(false)}>
                Guardar y cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reproductor invisible en segundo plano para el audio */}
      <div className="hidden-player"><div id="yt" /></div>
    </div>
  );
}
