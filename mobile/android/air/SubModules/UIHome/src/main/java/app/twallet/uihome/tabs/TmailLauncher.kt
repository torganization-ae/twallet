package app.twallet.uihome.tabs

import app.twallet.air.uicomponents.base.ITabsVC
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uiinappbrowser.InAppBrowserVC
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletcore.models.InAppBrowserConfig

object TmailLauncher {
    const val TMAIL_APP_URL = "https://tmail.ae"

    fun open(host: WViewController) {
        // Match iOS (showExplore) / web (switchToExplore) before opening the dapp browser.
        (host as? ITabsVC)?.switchToExplore()

        val window = host.window ?: return
        val inAppBrowserVC =
            InAppBrowserVC(
                host.context,
                host as? ITabsVC,
                InAppBrowserConfig(
                    url = TMAIL_APP_URL,
                    title = LocaleController.getString("TMail"),
                    injectDappConnect = true,
                    saveInVisitedHistory = true,
                )
            )
        val nav = WNavigationController(window)
        nav.setRoot(inAppBrowserVC)
        window.present(nav)
    }
}
