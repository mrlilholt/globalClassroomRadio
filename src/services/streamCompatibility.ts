import type { StationStreamType } from "../types/radio";

export interface StreamCompatibility {
  streamType: StationStreamType;
  audioCompatible: boolean;
}

const AUDIO_EXTENSIONS = [".aac", ".flac", ".m4a", ".mp3", ".oga", ".ogg", ".opus", ".wav"];
const VIDEO_EXTENSIONS = [".avi", ".m4v", ".mkv", ".mov", ".mp4", ".mpeg", ".mpg", ".ts", ".webm"];

function normalizeHint(value: string): string {
  return value.trim().toLowerCase();
}

function hasAnyToken(value: string, tokens: string[]): boolean {
  return tokens.some((token) => value.includes(token));
}

function inferFromHints(combinedHints: string): StationStreamType | null {
  if (hasAnyToken(combinedHints, ["mpegurl", "m3u8", "hls"])) {
    return "hls";
  }

  if (hasAnyToken(combinedHints, ["video", "h264", "h265", "hevc", "vp9"])) {
    return "video";
  }

  if (hasAnyToken(combinedHints, ["audio", "aac", "flac", "mp3", "ogg", "opus", "vorbis", "wav"])) {
    return "audio-native";
  }

  return null;
}

function inferFromUrl(url: string): StationStreamType | null {
  if (!url) {
    return null;
  }

  if (url.includes(".m3u8")) {
    return "hls";
  }

  if (AUDIO_EXTENSIONS.some((extension) => url.includes(extension))) {
    return "audio-native";
  }

  if (VIDEO_EXTENSIONS.some((extension) => url.includes(extension))) {
    return "video";
  }

  return null;
}

export function detectStreamCompatibility(streamUrl: string, hints: string[] = []): StreamCompatibility {
  const normalizedUrl = normalizeHint(streamUrl);
  const normalizedHints = hints.map(normalizeHint).filter((hint) => hint.length > 0);
  const combinedHints = normalizedHints.join(" ");

  const streamType = inferFromHints(combinedHints) ?? inferFromUrl(normalizedUrl) ?? "unknown";

  return {
    streamType,
    audioCompatible: streamType !== "video" && streamType !== "hls"
  };
}
