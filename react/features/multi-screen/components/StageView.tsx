import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState } from '../../app/types';
import Avatar from '../../base/avatar/components/Avatar';
import Icon from '../../base/icons/components/Icon';
import { IconArrowLeft, IconArrowRight } from '../../base/icons/svg';
import VideoTrack from '../../base/media/components/web/VideoTrack';
import { getParticipantById, getParticipantDisplayName } from '../../base/participants/functions';
import { getVideoTrackByParticipant } from '../../base/tracks/functions.any';
import { setStageFilmstripOpen } from '../actions';
import { getStageParticipantId, getStagePinnedId, isStageFilmstripOpen } from '../functions';

import StageFilmstripItem from './StageFilmstripItem';

/**
 * Width of a tile in the stage filmstrip, in pixels.
 */
const FILMSTRIP_TILE_WIDTH = 160;

/**
 * Height of a tile in the stage filmstrip, in pixels (16:9).
 */
const FILMSTRIP_TILE_HEIGHT = 90;

/**
 * Empty style object passed to {@link VideoTrack}, whose {@code style} prop is
 * required. Sizing and object-fit come from CSS; a shared constant keeps the
 * reference stable so VideoTrack never re-renders the element over it.
 */
const VIDEO_STYLE = {};

interface IProps {

    /**
     * The participant currently shown with the dominant-speaker ring, if any.
     */
    dominantSpeakerId: string | null;

    /**
     * Ordered participant IDs (local first, then remotes), including virtual
     * screenshare participants. These populate the filmstrip and are eligible for
     * the stage.
     */
    participantIds: string[];
}

/**
 * Stage layout for the secondary window.
 *
 * Features one thing on a large display — the active screenshare ({@code
 * object-fit: contain}, so slides and code are never cropped) when someone is
 * sharing, otherwise the dominant speaker — with a vertical filmstrip of everyone
 * down the right, mirroring the main window's stage view. Clicking a filmstrip
 * tile pins that screen or person to the stage; the election otherwise mirrors
 * the main window so both windows agree (see {@link getStageParticipantId}).
 *
 * @param {IProps} props - Component props.
 * @returns {React.ReactElement}
 */
const StageView: React.FC<IProps> = ({ dominantSpeakerId, participantIds }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const stageId = useSelector((state: IReduxState) => getStageParticipantId(state, participantIds));

    // The raw pin (independent of the auto-select fallbacks) marks which tile
    // shows the pin badge and toggles off on a repeat click.
    const pinnedId = useSelector(getStagePinnedId);

    // The featured participant resolves either a person's camera or, for a virtual
    // screenshare id, the shared desktop track (via getVideoTrackByParticipant).
    // The participant is resolved inside the selector so the subscription tracks
    // the video track, not the whole participant object — otherwise unrelated
    // updates (name, role, raised hand) would re-render the entire stage.
    const videoTrack = useSelector((state: IReduxState) =>
        getVideoTrackByParticipant(state, stageId ? getParticipantById(state, stageId) : undefined));

    // Render video only for a live, unmuted track; the avatar is shown otherwise.
    const hasVideo = Boolean(videoTrack?.jitsiTrack && !videoTrack.muted);

    // The deployment's localized fallback name is used when the participant has no
    // display name yet.
    const name = useSelector(
        (state: IReduxState) => (stageId ? getParticipantDisplayName(state, stageId) : ''));

    const filmstripOpen = useSelector(isStageFilmstripOpen);

    // With only yourself there is nothing to switch to, so the filmstrip (and its
    // toggle) are hidden and the stage uses the full window.
    const hasFilmstrip = participantIds.length > 1;

    const onToggleFilmstrip = useCallback(() => {
        dispatch(setStageFilmstripOpen(!filmstripOpen));
    }, [ dispatch, filmstripOpen ]);

    return (
        <div className = 'multi-screen-stage'>
            <div className = 'multi-screen-stage-main'>
                { hasVideo ? (
                    <VideoTrack
                        className = 'multi-screen-video'
                        id = 'multiScreenStageVideo'
                        muted = { true }
                        style = { VIDEO_STYLE }
                        videoTrack = { videoTrack } />
                ) : (
                    <div className = 'multi-screen-avatar'>
                        <Avatar
                            participantId = { stageId }
                            size = { 160 } />
                    </div>
                ) }
                { name && (
                    <div className = 'multi-screen-name-overlay'>
                        { name }
                    </div>
                ) }
            </div>
            { hasFilmstrip && (
                <div className = { `multi-screen-filmstrip-wrap ${filmstripOpen ? '' : 'collapsed'}` }>
                    <button
                        aria-expanded = { filmstripOpen }
                        aria-label = { t('multiScreen.toggleFilmstrip') }
                        className = 'multi-screen-filmstrip-toggle'
                        onClick = { onToggleFilmstrip }
                        type = 'button'>
                        <Icon
                            size = { 18 }
                            src = { filmstripOpen ? IconArrowRight : IconArrowLeft } />
                    </button>
                    <div className = 'multi-screen-stage-filmstrip'>
                        <div className = 'multi-screen-stage-filmstrip-inner'>
                            { participantIds.map(id => (
                                <StageFilmstripItem
                                    height = { FILMSTRIP_TILE_HEIGHT }
                                    isActiveSpeaker = { id === dominantSpeakerId }
                                    key = { id }
                                    participantId = { id }
                                    pinned = { id === pinnedId }
                                    width = { FILMSTRIP_TILE_WIDTH } />
                            )) }
                        </div>
                    </div>
                </div>
            ) }
        </div>
    );
};

export default StageView;
