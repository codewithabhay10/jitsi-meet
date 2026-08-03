import React from 'react';
import { useSelector } from 'react-redux';

import { IReduxState } from '../../app/types';
import Avatar from '../../base/avatar/components/Avatar';
import VideoTrack from '../../base/media/components/web/VideoTrack';
import {
    getParticipantById,
    getParticipantDisplayName,
    isScreenShareParticipantById
} from '../../base/participants/functions';
import { getVideoTrackByParticipant } from '../../base/tracks/functions.any';
import StatusIndicators from '../../filmstrip/components/web/StatusIndicators';

/**
 * Empty style object passed to {@link VideoTrack}, whose {@code style} prop is
 * required. Sizing and object-fit come from CSS classes instead; a shared
 * constant keeps the reference stable so VideoTrack's internal
 * {@code shouldComponentUpdate} never re-renders the element over it.
 */
const VIDEO_STYLE = {};

interface IProps {

    /**
     * The height of the tile in pixels.
     */
    height: number;

    /**
     * Whether this participant is the active/dominant speaker and should get
     * the speaking-indicator border.
     */
    isActiveSpeaker: boolean;

    /**
     * The participant ID to display.
     */
    participantId: string;

    /**
     * The width of the tile in pixels.
     */
    width: number;
}

/**
 * Individual participant tile for the gallery view in the secondary window.
 *
 * The shared {@link VideoTrack} leaf owns the attach/detach lifecycle (it
 * re-attaches only when the underlying {@code jitsiTrack} changes, so switching
 * which participant a tile shows never causes a black flash); the speaking
 * indicator border is driven by the {@code isActiveSpeaker} prop. Memoized so a
 * dominant-speaker change (which re-renders the gallery) only re-renders the two
 * tiles whose {@code isActiveSpeaker} actually flips, not every tile.
 *
 * @param {IProps} props - Component props.
 * @returns {React.ReactElement}
 */
const GalleryTile: React.FC<IProps> = ({
    height,
    isActiveSpeaker,
    participantId,
    width
}) => {
    // Resolve the name reactively from the store so renames update the label.
    // getParticipantDisplayName supplies the deployment's localized fallback
    // (defaultRemoteDisplayName) when a participant has no name yet.
    const participantName = useSelector(
        (state: IReduxState) => getParticipantDisplayName(state, participantId)
    );

    // A screenshare is a virtual participant whose track is owned by the real
    // sharer, so it is detected by id and resolved via getVideoTrackByParticipant
    // (below) rather than a direct participant-id track match. The flag also
    // switches the tile to object-fit: contain so slides/code are never cropped.
    // Subscribing to the boolean (not the participant object) avoids re-rendering
    // on unrelated participant updates.
    const isScreenshare = useSelector(
        (state: IReduxState) => isScreenShareParticipantById(state, participantId)
    );

    // getVideoTrackByParticipant returns the camera track for a real participant
    // and the desktop track for a virtual screenshare participant, so screenshare
    // tiles show the shared screen instead of falling back to the avatar. The
    // participant is resolved inside the selector so the subscription tracks the
    // video track, not the whole participant object — otherwise unrelated updates
    // (name, role, raised hand) would re-render the tile.
    const videoTrack = useSelector(
        (state: IReduxState) => getVideoTrackByParticipant(state, getParticipantById(state, participantId))
    );

    // Render video only for a live, unmuted track; muted/camera-off tiles show
    // the avatar instead.
    const hasVideo = Boolean(videoTrack?.jitsiTrack && !videoTrack.muted);

    const tileStyle = {
        width: `${width}px`,
        height: `${height}px`
    };

    // Mirror Jitsi's thumbnail avatar sizing: half the tile height, capped.
    const avatarSize = Math.floor(Math.min(height / 2, width - 30, 150));

    return (
        <div
            className = { `multi-screen-tile ${isActiveSpeaker ? 'speaking' : ''}` }
            style = { tileStyle }>
            { hasVideo ? (
                <VideoTrack
                    className = { `multi-screen-tile-video ${isScreenshare ? 'screen' : ''}` }
                    muted = { true }
                    style = { VIDEO_STYLE }
                    videoTrack = { videoTrack } />
            ) : (
                <div className = 'multi-screen-tile-avatar'>
                    <Avatar
                        participantId = { participantId }
                        size = { avatarSize } />
                </div>
            ) }
            <div className = 'multi-screen-tile-bottom'>
                <StatusIndicators
                    audio = { !isScreenshare }
                    moderator = { true }
                    participantID = { participantId }
                    screenshare = { isScreenshare }
                    thumbnailType = '' />
                <span className = 'multi-screen-tile-name'>
                    { participantName }
                </span>
            </div>
        </div>
    );
};

export default React.memo(GalleryTile);
