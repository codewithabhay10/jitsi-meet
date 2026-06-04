import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { IReduxState } from '../../app/types';
import Avatar from '../../base/avatar/components/Avatar';
import { MEDIA_TYPE } from '../../base/media/constants';
import { getLocalParticipant, getParticipantDisplayName } from '../../base/participants/functions';
import { getTrackByMediaTypeAndParticipant } from '../../base/tracks/functions.any';
import { getLargeVideoParticipant } from '../../large-video/functions';
import { SECONDARY_LAYOUTS } from '../constants';
import { getSecondaryLayout } from '../functions';

import GalleryTile from './GalleryTile';
import SecondaryToolbar from './SecondaryToolbar';
import { useAttachTrack } from './useAttachTrack';

/**
 * Audio level threshold for detecting active speaking.
 * Matches the threshold used in Jitsi's dominant speaker detection.
 */
const ACTIVE_SPEAKER_AUDIO_LEVEL_THRESHOLD = 0.02;

/**
 * Maximum number of columns in the gallery grid.
 */
const MAX_GALLERY_COLUMNS = 5;

/**
 * Gap between gallery tiles in pixels.
 */
const GALLERY_GAP = 4;

/**
 * Custom hook that tracks the active speaker based on real-time audio level
 * events, providing faster speaker switching than the conference-level
 * dominant speaker signal.
 *
 * @returns {string | null} The participant ID of the currently speaking participant.
 */
function useAudioLevelActiveSpeaker(): string | null {
    const [ activeSpeakerId, setActiveSpeakerId ] = useState<string | null>(null);
    const tracks = useSelector((state: IReduxState) => state['features/base/tracks']);

    useEffect(() => {
        const audioTracks = tracks.filter(
            t => t.mediaType === MEDIA_TYPE.AUDIO && t.jitsiTrack && !t.local
        );

        const handlers: Array<{ handler: (level: number) => void; track: any; }> = [];

        // Latest audio level per participant, so that when several people speak
        // at once the speaker resolves to the loudest rather than to whichever
        // event happened to fire last (which caused flicker).
        const levels = new Map<string, number>();

        const pickLoudest = () => {
            let loudestId: string | null = null;
            let loudestLevel = ACTIVE_SPEAKER_AUDIO_LEVEL_THRESHOLD;

            levels.forEach((level, id) => {
                if (level > loudestLevel) {
                    loudestLevel = level;
                    loudestId = id;
                }
            });

            // Hold the previous speaker while everyone is below the threshold.
            if (loudestId !== null) {
                setActiveSpeakerId(loudestId);
            }
        };

        audioTracks.forEach(track => {
            const jitsiTrack = track.jitsiTrack;

            if (!jitsiTrack) {
                return;
            }

            const handler = (level: number) => {
                levels.set(track.participantId, level);
                pickLoudest();
            };

            try {
                jitsiTrack.on('track.audioLevelChanged', handler);
                handlers.push({ track: jitsiTrack,
                    handler });
            } catch {
                // Track may not support audio level events.
            }
        });

        return () => {
            handlers.forEach(({ track: jitsiTrack, handler }) => {
                try {
                    jitsiTrack.off('track.audioLevelChanged', handler);
                } catch {
                    // Track may already be disposed.
                }
            });
        };
    }, [ tracks ]);

    return activeSpeakerId;
}

/**
 * Computes the grid dimensions (columns and rows) for the gallery view.
 * Uses a Jitsi-style heuristic: columns = min(ceil(sqrt(n)), maxColumns, n).
 *
 * @param {number} numberOfParticipants - The number of participants.
 * @param {number} maxColumns - Maximum number of columns.
 * @returns {Object} Grid dimensions with columns and rows.
 */
function getGalleryGridDimensions(
        numberOfParticipants: number,
        maxColumns: number
): { columns: number; rows: number; } {
    if (numberOfParticipants <= 0) {
        return { columns: 1,
            rows: 1 };
    }

    const columns = Math.min(
        Math.ceil(Math.sqrt(numberOfParticipants)),
        maxColumns,
        numberOfParticipants
    );
    const rows = Math.ceil(numberOfParticipants / columns);

    return { columns,
        rows };
}

/**
 * The main UI component rendered inside the secondary browser window.
 *
 * Supports two layout modes.
 * - Active Speaker: Shows the dominant/speaking participant in a large video.
 * - Gallery: Shows all participants in a responsive grid.
 *
 * @returns {React.ReactElement}
 */
const SecondaryConference: React.FC = () => {
    const { t } = useTranslation();
    const currentLayout = useSelector(
        (state: IReduxState) => getSecondaryLayout(state)
    );

    // Gallery container dimensions, tracked via a ResizeObserver bound through a
    // callback ref. The callback (re)attaches the observer whenever the grid
    // element mounts — including when participants arrive after the window was
    // opened on an empty gallery, a case a layout-only effect dependency missed.
    const [ galleryDimensions, setGalleryDimensions ] = useState({
        width: 800,
        height: 600
    });
    const galleryObserverRef = useRef<ResizeObserver | null>(null);

    const attachGalleryRef = useCallback((element: HTMLDivElement | null) => {
        galleryObserverRef.current?.disconnect();
        galleryObserverRef.current = null;

        if (!element) {
            return;
        }

        const measure = () => setGalleryDimensions({
            width: element.clientWidth,
            height: element.clientHeight
        });

        const observer = new ResizeObserver(measure);

        observer.observe(element);
        galleryObserverRef.current = observer;
        measure();
    }, []);

    // Get participants. Membership is driven by the filmstrip's
    // remoteParticipants array, which is reassigned immutably on join/leave.
    // The base participants Map is mutated in place, so selecting it directly
    // would never trigger a re-render when someone joins or leaves.
    const localParticipant = useSelector(
        (state: IReduxState) => getLocalParticipant(state)
    );
    const remoteParticipantIds = useSelector(
        (state: IReduxState) => state['features/filmstrip'].remoteParticipants
    );
    const dominantSpeaker = useSelector(
        (state: IReduxState) => state['features/base/participants']?.dominantSpeaker
    );
    const largeVideoParticipant = useSelector(
        (state: IReduxState) => getLargeVideoParticipant(state)
    );

    // Ordered list of participant IDs to display (local first, then remotes).
    const participantIds = useMemo(() => {
        const ids: string[] = [];

        if (localParticipant?.id) {
            ids.push(localParticipant.id);
        }

        return ids.concat(remoteParticipantIds);
    }, [ localParticipant?.id, remoteParticipantIds ]);

    // Active-speaker priority chain (resolved across the two values below).
    // Candidates that have already left the conference are skipped so a departed
    // participant is never shown.
    const audioLevelActiveSpeakerId = useAudioLevelActiveSpeaker();

    // The participant actively speaking, resolved from (in priority order)
    // real-time audio level, the conference dominant speaker, then the large
    // video selection. Null when the call is silent and no one has been
    // dominant yet — this drives the single dominant-speaker ring in the
    // gallery, mirroring the main window's blue indicator (one tile at a time).
    const dominantSpeakerId = useMemo(() => {
        const candidates = [
            audioLevelActiveSpeakerId, // Tier 1: real-time audio level
            dominantSpeaker, // Tier 2: conference dominant speaker
            largeVideoParticipant?.id // Tier 3: large video selection
        ];

        return candidates.find(id => id && participantIds.includes(id)) ?? null;
    }, [ audioLevelActiveSpeakerId, dominantSpeaker, largeVideoParticipant?.id, participantIds ]);

    // The active-speaker layout always shows someone, so it falls back to the
    // local participant when no one is speaking.
    const activeSpeakerId = dominantSpeakerId ?? localParticipant?.id;

    // Get the video track for the active speaker.
    const tracks = useSelector((state: IReduxState) => state['features/base/tracks']);
    const videoTrack = activeSpeakerId
        ? getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.VIDEO, activeSpeakerId)
        : undefined;

    // Resolve the active speaker's name for the overlay, with the deployment's
    // localized fallback (defaultRemoteDisplayName) when they have no name yet.
    const activeParticipantName = useSelector((state: IReduxState) =>
        (activeSpeakerId ? getParticipantDisplayName(state, activeSpeakerId) : ''));

    // Video element ref and track attach/detach lifecycle. currentLayout is the
    // reset key: switching back from Gallery remounts this <video>, so the track
    // must be re-attached even when the active speaker (and track) is unchanged.
    const videoRef = useRef<HTMLVideoElement>(null);

    useAttachTrack(videoRef, videoTrack, currentLayout);

    /**
     * Renders the Active Speaker layout.
     *
     * @returns {React.ReactElement}
     */
    const renderActiveSpeaker = useCallback(() => {
        const participantName = activeParticipantName;
        const hasVideo = Boolean(videoTrack?.jitsiTrack && !videoTrack.muted);

        return (
            <div className = 'multi-screen-active-speaker'>
                <div className = 'multi-screen-video-wrapper'>
                    <video
                        autoPlay = { true }
                        className = { `multi-screen-video ${hasVideo ? '' : 'hidden'}` }
                        id = 'multiScreenActiveSpeakerVideo'
                        playsInline = { true }
                        ref = { videoRef } />
                    { !hasVideo && (
                        <div className = 'multi-screen-avatar'>
                            <Avatar
                                participantId = { activeSpeakerId }
                                size = { 160 } />
                        </div>
                    ) }
                </div>
                <div className = 'multi-screen-name-overlay'>
                    { participantName }
                </div>
            </div>
        );
    }, [ activeParticipantName, activeSpeakerId, videoTrack ]);

    /**
     * Renders the Gallery layout with responsive grid.
     *
     * @returns {React.ReactElement}
     */
    const renderGallery = useCallback(() => {
        const count = participantIds.length;

        if (count === 0) {
            return (
                <div className = 'multi-screen-gallery-placeholder'>
                    <div className = 'multi-screen-gallery-message'>
                        { t('multiScreen.noParticipants') }
                    </div>
                </div>
            );
        }

        const { columns, rows } = getGalleryGridDimensions(count, MAX_GALLERY_COLUMNS);

        // Calculate tile dimensions based on gallery container size.
        const availableWidth = galleryDimensions.width - ((columns - 1) * GALLERY_GAP) - 16;
        const availableHeight = galleryDimensions.height - ((rows - 1) * GALLERY_GAP) - 16;
        const tileWidth = Math.floor(availableWidth / columns);
        const tileHeight = Math.floor(availableHeight / rows);

        // Build rows of participant IDs.
        const galleryRows: string[][] = [];

        for (let i = 0; i < count; i += columns) {
            galleryRows.push(participantIds.slice(i, i + columns));
        }

        return (
            <div
                className = 'multi-screen-gallery'
                ref = { attachGalleryRef }>
                { galleryRows.map((row, rowIndex) => (
                    <div
                        className = 'multi-screen-gallery-row'
                        key = { `row-${rowIndex}` }>
                        { row.map(id => (
                            <GalleryTile
                                height = { tileHeight }
                                isActiveSpeaker = { id === dominantSpeakerId }
                                key = { id }
                                participantId = { id }
                                width = { tileWidth } />
                        )) }
                    </div>
                )) }
            </div>
        );
    }, [ participantIds, galleryDimensions, dominantSpeakerId, t ]);

    return (
        <div className = 'multi-screen-container'>
            { currentLayout === SECONDARY_LAYOUTS.ACTIVE_SPEAKER
                ? renderActiveSpeaker()
                : renderGallery() }
            <SecondaryToolbar />
        </div>
    );
};

export default SecondaryConference;
