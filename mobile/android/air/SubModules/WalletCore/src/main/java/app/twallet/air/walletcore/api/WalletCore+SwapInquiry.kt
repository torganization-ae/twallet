package app.twallet.air.walletcore.api

import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.models.MBridgeError
import app.twallet.air.walletcore.stores.TokenStore

fun WalletCore.swapGetAssets(
    ifNotLoading: Boolean = false,
    callback: ((Boolean, MBridgeError?) -> Unit)? = null
) {
    if (ifNotLoading) {
        if (TokenStore.isLoadingSwapAssets) {
            return
        }
    }

    TokenStore.isLoadingSwapAssets = true
    bridge?.callApi(
        "swapGetAssets",
        "[]"
    ) { result, error ->
        if (error != null || result == null) {
            TokenStore.isLoadingSwapAssets = false
            callback?.invoke(false, error)
        } else {
            callback?.invoke(true, null)
        }
    }
}
