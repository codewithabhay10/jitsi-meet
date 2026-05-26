/**
 * Layout modes available for the secondary window.
 *
 * These are intentionally separate from the main window's LAYOUTS
 * (in features/video-layout/constants.ts) so that each window
 * can independently choose its own layout.
 */
export const SECONDARY_LAYOUTS = {

    /**
     * Active speaker view — shows the dominant/speaking participant
     * in a large video display.
     */
    ACTIVE_SPEAKER: 'active-speaker',

    /**
     * Gallery view — shows all participants in a responsive grid.
     */
    GALLERY: 'gallery'
} as const;

export type SecondaryLayout = typeof SECONDARY_LAYOUTS[keyof typeof SECONDARY_LAYOUTS];
