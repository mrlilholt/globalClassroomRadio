import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "../../../state/AppStateProvider";
import { canPlayStation } from "../../../services/classroomGuard";
import type { RadioStation } from "../../../types/radio";

type PlaybackStatus = "idle" | "ready" | "loading" | "playing" | "stopped" | "error";

function isStationPreviewCompatible(station: RadioStation): boolean {
  return station.audioCompatible || station.streamType === "hls" || station.streamType === "video";
}

function toPlaybackErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Playback was blocked by the browser. Click Play again to continue.";
    }

    return `Playback failed (${error.name}).`;
  }

  return "Unable to play this station preview.";
}

function readMediaErrorMessage(mediaError: MediaError | null): string {
  if (!mediaError) {
    return "Unable to play this station preview.";
  }

  switch (mediaError.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "Playback was interrupted.";
    case MediaError.MEDIA_ERR_NETWORK:
      return "Network error while streaming station.";
    case MediaError.MEDIA_ERR_DECODE:
      return "Audio stream could not be decoded.";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "This station stream is not supported by the browser.";
    default:
      return "Unable to play this station preview.";
  }
}

export function PlayerPanel() {
  const {
    state: { selectedStationId, stations, classroomMode, whitelistIds }
  } = useAppState();

  const selectedStation = useMemo(
    () => stations.find((station) => station.stationuuid === selectedStationId) ?? null,
    [selectedStationId, stations]
  );
  const isSelectionPlayable = selectedStationId
    ? canPlayStation({
        stationId: selectedStationId,
        classroomMode,
        whitelistIds
      })
    : false;
  const isSelectionStreamSupported = selectedStation ? isStationPreviewCompatible(selectedStation) : false;
  const canAttemptPlayback = Boolean(selectedStation) && isSelectionPlayable && isSelectionStreamSupported;
  const mediaRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("idle");
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }

    const disposeHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    if (!selectedStation) {
      disposeHls();
      media.pause();
      media.removeAttribute("src");
      media.load();
      setPlaybackStatus("idle");
      setPlaybackError(null);
      return;
    }

    if (!isSelectionStreamSupported) {
      disposeHls();
      media.pause();
      media.removeAttribute("src");
      media.load();
      setPlaybackStatus("stopped");
      setPlaybackError(`This station cannot be previewed because its stream type is '${selectedStation.streamType}'.`);
      return;
    }

    disposeHls();
    media.pause();
    media.removeAttribute("src");
    media.load();
    setPlaybackError(null);

    const loadDirectSource = () => {
      media.src = selectedStation.urlResolved;
      media.load();
      setPlaybackStatus("ready");
    };

    if (selectedStation.streamType !== "hls") {
      loadDirectSource();
      return;
    }

    if (media.canPlayType("application/vnd.apple.mpegurl")) {
      loadDirectSource();
      return;
    }

    let isDisposed = false;
    setPlaybackStatus("loading");

    void import("hls.js")
      .then(({ default: Hls }) => {
        if (isDisposed) {
          return;
        }

        if (!Hls.isSupported()) {
          setPlaybackStatus("error");
          setPlaybackError("This browser cannot play HLS streams for this station.");
          return;
        }

        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setPlaybackStatus("ready");
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) {
            return;
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              if (hlsRef.current === hls) {
                hlsRef.current = null;
              }
              setPlaybackStatus("error");
              setPlaybackError("HLS stream could not be initialized.");
          }
        });

        hls.loadSource(selectedStation.urlResolved);
        hls.attachMedia(media);
      })
      .catch(() => {
        if (isDisposed) {
          return;
        }

        setPlaybackStatus("error");
        setPlaybackError("HLS playback engine failed to load.");
      });

    return () => {
      isDisposed = true;
      disposeHls();
    };
  }, [isSelectionStreamSupported, selectedStation]);

  const handlePlay = async () => {
    const media = mediaRef.current;
    if (!media || !selectedStation || !canAttemptPlayback) {
      return;
    }

    setPlaybackStatus("loading");
    setPlaybackError(null);

    try {
      await media.play();
    } catch (error: unknown) {
      setPlaybackStatus("error");
      setPlaybackError(toPlaybackErrorMessage(error));
    }
  };

  const handleStop = () => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }

    media.pause();
    media.currentTime = 0;
    setPlaybackStatus(selectedStation ? "stopped" : "idle");
  };

  const statusMessage = (() => {
    if (!selectedStation) {
      return "Select a station in discovery to start preview.";
    }

    if (!isSelectionStreamSupported) {
      return "Selected stream is not supported by the player.";
    }

    if (!isSelectionPlayable) {
      return "Playback blocked by classroom mode policy.";
    }

    switch (playbackStatus) {
      case "ready":
        return selectedStation.streamType === "hls" ? "Ready to play (HLS)." : "Ready to play.";
      case "loading":
        return "Connecting to stream...";
      case "playing":
        return "Now playing.";
      case "stopped":
        return "Stopped.";
      case "error":
        return "Playback error.";
      case "idle":
      default:
        return "Idle.";
    }
  })();
  const statusToneClass = (() => {
    if (!selectedStation) {
      return "status-pill-neutral";
    }

    if (!isSelectionStreamSupported || !isSelectionPlayable || playbackStatus === "error") {
      return "status-pill-warning";
    }

    if (playbackStatus === "playing") {
      return "status-pill-success";
    }

    return "status-pill-neutral";
  })();

  return (
    <section className="player-dock" aria-label="Persistent Audio Player">
      <div className="player-dock-inner">
        <div className="player-dock-header">
          <p className="player-brand">Digital Classroom Tuner</p>
          <p className={`status-pill ${statusToneClass}`} aria-live="polite">
            {statusMessage}
          </p>
        </div>
        <div className="player-dock-content">
          <div className="player-display" role="status" aria-live="polite">
            <p className="player-display-label">Now tuning</p>
            <p className="player-display-title">{selectedStation?.name ?? "No station selected"}</p>
            <p className="player-display-meta">
              {selectedStation ? `${selectedStation.country} | ${selectedStation.language}` : "Choose a station from discovery"}
            </p>
            {selectedStation ? <p className="player-display-stream">{selectedStation.urlResolved}</p> : null}
          </div>
          <div className="player-dock-controls-wrap">
            <div className={`signal-meter${playbackStatus === "playing" ? " is-live" : ""}`} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="player-controls" role="group" aria-label="Player controls">
              <button
                type="button"
                className="text-button primary-button"
                onClick={handlePlay}
                disabled={!canAttemptPlayback || playbackStatus === "loading" || playbackStatus === "playing"}
              >
                Play
              </button>
              <button type="button" className="text-button" onClick={handleStop} disabled={!selectedStation}>
                Stop
              </button>
            </div>
          </div>
        </div>
        {selectedStation && selectedStation.streamType === "hls" ? (
          <p className="hint-text">HLS stream selected. Playback quality and support can vary by browser.</p>
        ) : null}
        {selectedStation && selectedStation.streamType === "video" ? (
          <p className="hint-text">Video stream selected. Audio will play in the dock player.</p>
        ) : null}
        {selectedStation && !isSelectionStreamSupported ? (
          <p className="warning-text">
            This station cannot be previewed because its stream type is <strong>{selectedStation.streamType}</strong>.
          </p>
        ) : null}
        {selectedStation && !isSelectionPlayable ? (
          <p className="warning-text">This station is blocked. Only whitelisted stations can play in classroom mode.</p>
        ) : null}
        {playbackError ? (
          <p className="warning-text" role="alert">
            {playbackError}
          </p>
        ) : null}
      </div>

      <video
        ref={mediaRef}
        preload="none"
        playsInline
        className="sr-only"
        onPlaying={() => {
          setPlaybackStatus("playing");
          setPlaybackError(null);
        }}
        onWaiting={() => {
          setPlaybackStatus("loading");
        }}
        onEnded={() => {
          setPlaybackStatus("stopped");
        }}
        onError={() => {
          const media = mediaRef.current;
          setPlaybackStatus("error");
          setPlaybackError(readMediaErrorMessage(media?.error ?? null));
        }}
      />
    </section>
  );
}
