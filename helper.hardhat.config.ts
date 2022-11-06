type NetworkConfig = {
    [key: number]: {
        blockConfirmations: number
        keyHash: string
        randomWordsSubscriptionId: string
        callbackGasLimit: string
        requestConfirmations: string
        V3AggregatorAddress?: string
        VRFCoordinatorV2Address?: string
    }
}

export const networkConfig: NetworkConfig = {
    5: {
        blockConfirmations: 6,
        keyHash: '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15',
        randomWordsSubscriptionId: '6105',
        callbackGasLimit: '100000',
        requestConfirmations: '3',
        VRFCoordinatorV2Address: '0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D',
    },
    31337: {
        blockConfirmations: 1,
        keyHash: '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15',
        randomWordsSubscriptionId: '6105',
        callbackGasLimit: '100000',
        requestConfirmations: '1',
    },
}
