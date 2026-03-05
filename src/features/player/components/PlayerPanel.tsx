import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "../../../state/AppStateProvider";
import { canPlayStation } from "../../../services/classroomGuard";

type PlaybackStatus = "idle" | "ready" | "loading" | "playing" | "stopped" | "error";

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
  const isAudioCompatible = selectedStation?.audioCompatible ?? false;
  const isSelectionPlayable = selectedStationId
    ? canPlayStation({
        stationId: selectedStationId,
        classroomMode,
        whitelistIds
      })
    : false;
  const canAttemptPlayback = Boolean(selectedStation) && isSelectionPlayable && isAudioCompatible;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("idle");
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!selectedStation) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setPlaybackStatus("idle");
      setPlaybackError(null);
      return;
    }

    if (!isAudioCompatible) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setPlaybackStatus("stopped");
      setPlaybackError("This station uses a video/HLS stream and cannot be previewed in the audio player.");
      return;
    }

    audio.pause();
    audio.src = selectedStation.urlResolved;
    audio.load();
    setPlaybackStatus("ready");
    setPlaybackError(null);
  }, [isAudioCompatible, selectedStation]);

  const handlePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !selectedStation || !canAttemptPlayback) {
      return;
    }

    setPlaybackStatus("loading");
    setPlaybackError(null);

    try {
      await audio.play();
    } catch (error: unknown) {
      setPlaybackStatus("error");
      setPlaybackError(toPlaybackErrorMessage(error));
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    setPlaybackStatus(selectedStation ? "stopped" : "idle");
  };

  const statusMessage = (() => {
    if (!selectedStation) {
      return "Select a station in discovery to start preview.";
    }

    if (!isAudioCompatible) {
      return "Selected stream is not audio-compatible.";
    }

    if (!isSelectionPlayable) {
      return "Playback blocked by classroom mode policy.";
    }

    switch (playbackStatus) {
      case "ready":
        return "Ready to play.";
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

    if (!isAudioCompatible || !isSelectionPlayable || playbackStatus === "error") {
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
        {selectedStation && !isAudioCompatible ? (
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

      <audio
        ref={audioRef}
        preload="none"
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
          const audio = audioRef.current;
          setPlaybackStatus("error");
          setPlaybackError(readMediaErrorMessage(audio?.error ?? null));
        }}
      />
    </section>
  );
}
