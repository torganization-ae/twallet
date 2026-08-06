package app.twallet.air.uiinappbrowser

import app.twallet.air.walletcontext.DeeplinkOpenSource

internal enum class InAppBrowserUrlRoutingDecision {
    ALLOW_WEB_VIEW,
    CONSUME,
    OPEN_DIAL_INTENT,
    OPEN_SMS_INTENT,
    OPEN_SYSTEM_VIEW_INTENT;

    companion object {
        fun resolve(
            url: String,
            handleDeeplink: (String, DeeplinkOpenSource) -> Boolean
        ): InAppBrowserUrlRoutingDecision {
            val scheme = extractUrlScheme(url) ?: return ALLOW_WEB_VIEW

            return when (scheme) {
                "intent" -> CONSUME
                "tel" -> OPEN_DIAL_INTENT
                "sms" -> OPEN_SMS_INTENT
                "geo", "mailto", "market", "tg" -> OPEN_SYSTEM_VIEW_INTENT
                "http" -> CONSUME
                "https" -> ALLOW_WEB_VIEW
                else -> resolveCustomSchemeRouting(url, handleDeeplink)
            }
        }

        private fun resolveCustomSchemeRouting(
            url: String,
            handleDeeplink: (String, DeeplinkOpenSource) -> Boolean
        ): InAppBrowserUrlRoutingDecision {
            val isHandled = handleDeeplink(url, DeeplinkOpenSource.IN_APP_BROWSER)
            if (isHandled) {
                return CONSUME
            }

            return ALLOW_WEB_VIEW
        }

        private fun extractUrlScheme(url: String): String? {
            val schemeEndIndex = url.indexOf(':')
            if (schemeEndIndex <= 0) {
                return null
            }

            return url.substring(0, schemeEndIndex).lowercase()
        }
    }
}
