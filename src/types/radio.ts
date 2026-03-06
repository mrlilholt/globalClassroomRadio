export type StationSource = "radio-browser" | "iprd" | "iptv-org" | "curated";

export type StationStreamType = "audio-native" | "hls" | "video" | "unknown";

export interface RadioStation {
  stationuuid: string;
  name: string;
  urlResolved: string;
  country: string;
  language: string;
  tags: string;
  source: StationSource;
  streamType: StationStreamType;
  audioCompatible: boolean;
  supplemental: boolean;
}

export interface StationQuery {
  country: string;
  language: string;
  tags: string;
  safeOnly?: boolean;
}

export interface StationFilters {
  country: string | null;
  language: string | null;
  tags: string[];
}
