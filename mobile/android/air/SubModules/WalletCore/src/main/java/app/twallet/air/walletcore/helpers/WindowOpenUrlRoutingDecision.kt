package app.twallet.air.walletcore.helpers

import app.twallet.air.walletcontext.DeeplinkOpenSource

internal enum class WindowOpenUrlRoutingDecision {
    CONSUME,
    LOAD_URL;

    companion object {
        fun resolve(
            url: String,
            handleDeeplink: (String, DeeplinkOpenSource) -> Boolean
        ): WindowOpenUrlRoutingDecision {
            val isHandled = handleDeeplink(url, DeeplinkOpenSource.IN_APP_BROWSER)
            if (isHandled) {
                return CONSUME
            }

            return LOAD_URL
        }
    }
}
