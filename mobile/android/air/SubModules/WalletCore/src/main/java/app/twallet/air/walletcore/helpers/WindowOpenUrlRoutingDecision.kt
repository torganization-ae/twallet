package app.twallet.air.walletcore.helpers

import app.twallet.air.walletcontext.DeeplinkOpenSource
import app.twallet.air.walletcontext.helpers.InAppBrowserDeeplinkHelpers

internal enum class WindowOpenUrlRoutingDecision {
    CONSUME,
    LOAD_URL;

    companion object {
        fun resolve(
            url: String,
            handleDeeplink: (String, DeeplinkOpenSource) -> Boolean
        ): WindowOpenUrlRoutingDecision {
            if (InAppBrowserDeeplinkHelpers.checkIsInAppBrowserOfframpSelfDeeplink(url)) {
                return CONSUME
            }

            val isHandled = handleDeeplink(url, DeeplinkOpenSource.IN_APP_BROWSER)
            if (isHandled) {
                return CONSUME
            }

            return LOAD_URL
        }
    }
}
