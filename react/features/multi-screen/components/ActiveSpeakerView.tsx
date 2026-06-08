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
     * The participant to feature on the stage, or undefined when there is no one
     * to show (e.g. an empty conference).
     */
    participantId?: string;
}

/**
 * Active Speaker layout for the secondary window: the featured participant's
 * video filling the stage, with an avatar fallback and a name overlay.
 *
 * Mounted only while the Active Speaker layout is selected, so its {@code <video>}
 * (and the attached track) is torn down and recreated across a layout switch —
 * the fresh mount re-attaches the track without any manual reset key.
 *
 * @param {IProps} props - Component props.
 * @returns {React.ReactElement}
 */
const ActiveSpeakerView: React.FC<IProps> = ({ participantId }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Select this participant's specific video track (not the whole tracks
    // slice) so the stage only re-renders when the featured speaker's track
    // changes.
    const videoTrack = useSelector((state: IReduxState) => (participantId
        ? getTrackByMediaTypeAndParticipant(state['features/base/tracks'], MEDIA_TYPE.VIDEO, participantId)
        : undefined));
    const hasVideo = Boolean(videoTrack?.jitsiTrack && !videoTrack.muted);

    // The deployment's localized fallback name is used when the participant has
    // no display name yet.
    const participantName = useSelector((state: IReduxState) =>
        (participantId ? getParticipantDisplayName(state, participantId) : ''));

    // Attach only a live, unmuted track; the avatar is shown otherwise.
    useAttachTrack(videoRef, hasVideo ? videoTrack : undefined);

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
                            participantId = { participantId }
                            size = { 160 } />
                    </div>
                ) }
            </div>
            <div className = 'multi-screen-name-overlay'>
                { participantName }
            </div>
        </div>
    );
};

export default ActiveSpeakerView;
