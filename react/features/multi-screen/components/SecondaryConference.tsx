import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { IReduxState } from '../../app/types';
import {
    getDominantSpeakerParticipant,
    getLocalParticipant,
    getLocalScreenShareParticipant
} from '../../base/participants/functions';
import { SECONDARY_LAYOUTS } from '../constants';
import { getSecondaryLayout } from '../functions';

import GalleryView from './GalleryView';
import SecondaryToolbar from './SecondaryToolbar';
import StageView from './StageView';

/**
 * The main UI component rendered inside the secondary browser window.
 *
 * Renders the currently selected secondary layout — Stage (one screen or person
 * featured large with a filmstrip) or Tile (a grid of everyone) — plus the
 * toolbar. Only the active layout is mounted at a time.
 *
 * @returns {React.ReactElement}
 */
const SecondaryConference: React.FC = () => {
    const currentLayout = useSelector(
        (state: IReduxState) => getSecondaryLayout(state)
    );

    // Participant membership is driven by the filmstrip's remoteParticipants
    // array, which is reassigned immutably on join/leave. The base participants
    // Map is mutated in place, so selecting it directly would never trigger a
    // re-render when someone joins or leaves.
    const localParticipant = useSelector(
        (state: IReduxState) => getLocalParticipant(state)
    );

    // Your own shared screen is a separate virtual participant (not part of the
    // filmstrip's remoteParticipants), so include it explicitly — otherwise it
    // has no tile and can't be featured/pinned on the stage, mirroring how the
    // main filmstrip renders the local screenshare alongside the local thumbnail.
    const localScreenShareId = useSelector(
        (state: IReduxState) => getLocalScreenShareParticipant(state)?.id
    );
    const remoteParticipantIds = useSelector(
        (state: IReduxState) => state['features/filmstrip'].remoteParticipants
    );

    // The conference dominant speaker drives the gallery's speaking ring,
    // mirroring the main window's thumbnail indicator (one tile at a time).
    const dominantSpeakerId = useSelector(
        (state: IReduxState) => getDominantSpeakerParticipant(state)?.id ?? null
    );

    // Ordered list of every participant ID: local first, then your own shared
    // screen (when sharing), then remotes.
    const participantIds = useMemo(() => {
        const ids: string[] = [];

        if (localParticipant?.id) {
            ids.push(localParticipant.id);
        }
        if (localScreenShareId) {
            ids.push(localScreenShareId);
        }

        return ids.concat(remoteParticipantIds);
    }, [ localParticipant?.id, localScreenShareId, remoteParticipantIds ]);

    /**
     * Renders the view for the currently selected secondary layout.
     *
     * @returns {React.ReactElement}
     */
    const renderLayout = () => {
        switch (currentLayout) {
        case SECONDARY_LAYOUTS.TILE:
            return (
                <GalleryView
                    dominantSpeakerId = { dominantSpeakerId }
                    participantIds = { participantIds } />
            );
        case SECONDARY_LAYOUTS.STAGE:
        default:
            return (
                <StageView
                    dominantSpeakerId = { dominantSpeakerId }
                    participantIds = { participantIds } />
            );
        }
    };

    return (
        <div className = 'multi-screen-container'>
            <div className = 'multi-screen-content'>
                { renderLayout() }
            </div>
            <SecondaryToolbar />
        </div>
    );
};

export default SecondaryConference;
