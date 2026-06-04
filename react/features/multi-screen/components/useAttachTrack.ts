import { RefObject, useEffect, useRef } from 'react';

import { ITrack } from '../../base/tracks/types';

/**
 * Attaches a video track to a {@code <video>} element and keeps it in sync:
 * detaches the previous track when it changes and on unmount, and clears the
 * element ({@code srcObject = null}) when there is no track so a stale frame is
 * never left on screen.
 *
 * Shared by the active-speaker stage and each gallery tile so the attach/detach
 * lifecycle lives in one place.
 *
 * @param {RefObject<HTMLVideoElement>} videoRef - Ref to the target video element.
 * @param {ITrack} [videoTrack] - The track to display, if any.
 * @param {unknown} [resetKey] - Optional value that forces a re-attach when it
 * changes even if the track is unchanged. Needed when the video element is
 * remounted while the track stays the same — e.g. switching the secondary
 * window back from Gallery to Active Speaker — so the new element gets the track.
 * @returns {void}
 */
export function useAttachTrack(
        videoRef: RefObject<HTMLVideoElement>,
        videoTrack?: ITrack,
        resetKey?: unknown
): void {
    const previousTrackRef = useRef<ITrack | undefined>(undefined);

    useEffect(() => {
        const videoElement = videoRef.current;

        if (!videoElement) {
            return;
        }

        // Detach the previously-attached track from this element.
        if (previousTrackRef.current?.jitsiTrack) {
            previousTrackRef.current.jitsiTrack.detach(videoElement);
        }

        if (videoTrack?.jitsiTrack) {
            videoTrack.jitsiTrack.attach(videoElement);
        } else {
            // Prevent stale frames when there is nothing to show.
            videoElement.srcObject = null;
        }

        previousTrackRef.current = videoTrack;

        return () => {
            if (videoTrack?.jitsiTrack && videoElement) {
                videoTrack.jitsiTrack.detach(videoElement);
            }
        };
    }, [ videoTrack, resetKey ]);
}
