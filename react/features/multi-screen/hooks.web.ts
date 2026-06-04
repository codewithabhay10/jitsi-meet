import MultiScreenButton from './components/MultiScreenButton';

const multiScreen = {
    key: 'multi-screen',
    Content: MultiScreenButton,
    group: 2
};

/**
 * A hook that returns the multi-screen button if it is supported and undefined otherwise.
 *
 * @returns {Object | undefined}
 */
export function useMultiScreenButton() {
    return multiScreen;
}
