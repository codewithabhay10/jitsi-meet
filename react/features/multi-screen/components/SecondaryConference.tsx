import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { IReduxState } from '../../app/types';
import { JitsiTrackEvents } from '../../base/lib-jitsi-meet';
import { MEDIA_TYPE } from '../../base/media/constants';
import { getLocalParticipant } from '../../base/participants/functions';
import { ITrack } from '../../base/tracks/types';
import { getLargeVideoParticipant } from '../../large-video/functions';
import { SECONDARY_LAYOUTS } from '../constants';
import { getSecondaryLayout } from '../functions';

import ActiveSpeakerView from './ActiveSpeakerView';
import GalleryView from './GalleryView';
import SecondaryToolbar from './SecondaryToolbar';

/**
 * Audio level threshold for detecting active speaking.
 * Matches the threshold used in Jitsi's dominant speaker detection.
 */
const ACTIVE_SPEAKER_AUDIO_LEVEL_THRESHOLD = 0.02;

/**
 * How long (ms) a participant's last audio-level reading stays valid. Entries
 * older than this are ignored (and pruned) when resolving the loudest speaker,
 * so someone who spoke once and then went quiet — or whose track stopped
 * emitting levels — is not held as the active speaker indefinitely.
 */
const SPEAKER_LEVEL_TTL_MS = 2000;

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
        // The local participant is excluded on purpose: in their own pop-out the
        // active speaker should follow the people they are listening to, not
        // their own microphone.
        const audioTracks = tracks.filter(
            t => t.mediaType === MEDIA_TYPE.AUDIO && t.jitsiTrack && !t.local
        );

        const handlers: Array<{ handler: (level: number) => void; track: ITrack; }> = [];

        // Latest audio level (with a timestamp) per participant, so that when
        // several people speak at once the speaker resolves to the loudest
        // rather than to whichever event happened to fire last (which caused
        // flicker), and stale readings can be aged out (see SPEAKER_LEVEL_TTL_MS).
        const levels = new Map<string, { level: number; timestamp: number; }>();

        const pickLoudest = () => {
            const now = Date.now();
            let loudestId: string | null = null;
            let loudestLevel = ACTIVE_SPEAKER_AUDIO_LEVEL_THRESHOLD;

            levels.forEach((entry, id) => {
                if (now - entry.timestamp > SPEAKER_LEVEL_TTL_MS) {
                    levels.delete(id);

                    return;
                }

                if (entry.level > loudestLevel) {
                    loudestLevel = entry.level;
                    loudestId = id;
                }
            });

            // Hold the previous speaker while everyone is below the threshold.
            if (loudestId !== null) {
                setActiveSpeakerId(loudestId);
            }
        };

        audioTracks.forEach(track => {
            const handler = (level: number) => {
                levels.set(track.participantId, { level,
                    timestamp: Date.now() });
                pickLoudest();
            };

            track.jitsiTrack.on(JitsiTrackEvents.TRACK_AUDIO_LEVEL_CHANGED, handler);
            handlers.push({ handler,
                track });
        });

        return () => {
            handlers.forEach(({ handler, track }) => {
                track.jitsiTrack?.off(JitsiTrackEvents.TRACK_AUDIO_LEVEL_CHANGED, handler);
            });
        };
    }, [ tracks ]);

    return activeSpeakerId;
}

/**
 * The main UI component rendered inside the secondary browser window.
 *
 * Resolves the participant list and the active speaker, then delegates to the
 * Active Speaker or Gallery view depending on the selected layout. Each view is
 * mounted only while its layout is active.
 *
 * @returns {React.ReactElement}
 */
const SecondaryConference: React.FC = () => {
    const currentLayout = useSelector(
        (state: IReduxState) => getSecondaryLayout(state)
    );

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

    const audioLevelActiveSpeakerId = useAudioLevelActiveSpeaker();

    // The participant actively speaking, resolved from (in priority order)
    // real-time audio level, the conference dominant speaker, then the large
    // video selection. Candidates that have already left are skipped. Null when
    // the call is silent and no one has been dominant yet — this drives the
    // single dominant-speaker ring in the gallery, mirroring the main window's
    // blue indicator (one tile at a time).
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

    return (
        <div className = 'multi-screen-container'>
            { currentLayout === SECONDARY_LAYOUTS.ACTIVE_SPEAKER
                ? <ActiveSpeakerView participantId = { activeSpeakerId } />
                : <GalleryView
                    dominantSpeakerId = { dominantSpeakerId }
                    participantIds = { participantIds } /> }

            <SecondaryToolbar />
        </div>
    );
};

export default SecondaryConference;
