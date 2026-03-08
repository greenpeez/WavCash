const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify token exchange failed: ${err}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error("Failed to refresh Spotify token");
  return res.json() as Promise<{
    access_token: string;
    expires_in: number;
  }>;
}

export async function getClientCredentialsToken() {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) throw new Error("Failed to get Spotify client credentials token");
  return res.json() as Promise<{
    access_token: string;
    expires_in: number;
  }>;
}

export async function spotifyFetch(endpoint: string, accessToken: string) {
  const res = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify API error (${res.status}): ${err}`);
  }

  return res.json();
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; height: number; width: number }[];
  genres: string[];
  popularity: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  album: {
    name: string;
    release_date: string;
    images: { url: string; height: number; width: number }[];
  };
  external_ids: { isrc?: string };
  duration_ms: number;
  popularity: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  images: { url: string; height: number; width: number }[];
  tracks: {
    items: {
      id: string;
      name: string;
      duration_ms: number;
    }[];
    total: number;
  };
}

export function extractArtistId(spotifyUrl: string): string | null {
  // Handle various Spotify URL formats
  const patterns = [
    /spotify\.com\/artist\/([a-zA-Z0-9]+)/,
    /spotify:artist:([a-zA-Z0-9]+)/,
  ];
  for (const p of patterns) {
    const match = spotifyUrl.match(p);
    if (match) return match[1];
  }
  return null;
}

export function extractTrackId(spotifyUrl: string): string | null {
  const patterns = [
    /spotify\.com\/track\/([a-zA-Z0-9]+)/,
    /spotify:track:([a-zA-Z0-9]+)/,
  ];
  for (const p of patterns) {
    const match = spotifyUrl.match(p);
    if (match) return match[1];
  }
  return null;
}
