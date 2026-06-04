import React, { useRef } from 'react';
import { useSelector } from 'react-redux';

import { IReduxState } from '../../app/types';
import Avatar from '../../base/avatar/components/Avatar';
import { MEDIA_TYPE } from '../../base/media/constants';
import { getParticipantDisplayName } from '../../base/participants/functions';
import { getTrackByMediaTypeAndParticipant } from '../../base/tracks/functions.any';

import { useAttachTrack } from './useAttachTrack';

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
 * Each tile manages its own video track attach/detach lifecycle; the speaking
 * indicator border is driven by the {@code isActiveSpeaker} prop.
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
    const videoRef = useRef<HTMLVideoElement>(null);

    // Resolve the name reactively from the store so renames update the label.
    // getParticipantDisplayName supplies the deployment's localized fallback
    // (defaultRemoteDisplayName) when a participant has no name yet.
    const participantName = useSelector(
        (state: IReduxState) => getParticipantDisplayName(state, participantId)
    );

    // Get video track for this participant.
    const tracks = useSelector((state: IReduxState) => state['features/base/tracks']);
    const videoTrack = getTrackByMediaTypeAndParticipant(
        tracks, MEDIA_TYPE.VIDEO, participantId
    );

    const hasVideo = Boolean(videoTrack?.jitsiTrack && !videoTrack.muted);

    // Video track attach/detach lifecycle.
    useAttachTrack(videoRef, videoTrack);

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
            <video
                autoPlay = { true }
                className = { `multi-screen-tile-video ${hasVideo ? '' : 'hidden'}` }
                playsInline = { true }
                ref = { videoRef } />
            { !hasVideo && (
                <div className = 'multi-screen-tile-avatar'>
                    <Avatar
                        participantId = { participantId }
                        size = { avatarSize } />
                </div>
            ) }
            <div className = 'multi-screen-tile-name'>
                { participantName }
            </div>
        </div>
    );
};

export default GalleryTile;
