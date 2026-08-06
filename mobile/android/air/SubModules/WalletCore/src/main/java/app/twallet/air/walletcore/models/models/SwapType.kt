package app.twallet.air.walletcore.models

import app.twallet.air.walletcore.moshi.IApiToken

enum class SwapType {
    ON_CHAIN,
    CROSS_CHAIN_FROM_WALLET,
    CROSS_CHAIN_TO_WALLET;

    companion object {
        fun from(
            tokenToSend: IApiToken,
            tokenToReceive: IApiToken,
            walletAddressByChain: Map<String, String>
        ): SwapType {
            val sendChain = tokenToSend.mBlockchain
            if (sendChain != null &&
                sendChain == tokenToReceive.mBlockchain &&
                sendChain.isOnchainSwapSupported
            ) {
                return ON_CHAIN
            }

            if (walletAddressByChain.contains(tokenToSend.chain)) {
                return CROSS_CHAIN_FROM_WALLET
            }

            return CROSS_CHAIN_TO_WALLET
        }
    }
}
