package app.twallet.uihome.tabs

import android.view.View
import app.twallet.air.uicomponents.base.ITabsVC
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.menu.WMenuPopup
import app.twallet.air.uicomponents.widgets.menu.WMenuPopup.BackgroundStyle
import app.twallet.air.uiinappbrowser.InAppBrowserVC
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletcore.models.InAppBrowserConfig
import app.twallet.uihome.R

object ProductChooserHelper {
    const val TMAIL_APP_URL = "https://app.tmail.ae"
    const val MINT_APP_URL = "https://tmarket.ae"

    fun present(anchor: View, host: WViewController) {
        WMenuPopup.present(
            view = anchor,
            items =
                listOf(
                    WMenuPopup.Item(
                        config =
                            WMenuPopup.Item.Config.Item(
                                icon =
                                    WMenuPopup.Item.Config.Icon(
                                        R.drawable.ic_tmail,
                                        tintColor = WColor.PrimaryText
                                    ),
                                title = LocaleController.getString("TMail")
                            ),
                        hasSeparator = true,
                        onTap = { openProduct(host, TMAIL_APP_URL, LocaleController.getString("TMail")) }
                    ),
                    WMenuPopup.Item(
                        config =
                            WMenuPopup.Item.Config.Item(
                                icon =
                                    WMenuPopup.Item.Config.Icon(
                                        R.drawable.ic_mint,
                                        tintColor = null
                                    ),
                                title = LocaleController.getString("Mint")
                            ),
                        hasSeparator = false,
                        onTap = { openProduct(host, MINT_APP_URL, LocaleController.getString("Mint")) }
                    ),
                ),
            yOffset = (-4).dp,
            positioning = WMenuPopup.Positioning.ABOVE,
            centerHorizontally = true,
            windowBackgroundStyle =
                BackgroundStyle.Cutout.fromView(
                    anchor,
                    roundRadius = 16f.dp,
                ),
        )
    }

    private fun openProduct(host: WViewController, url: String, title: String) {
        (host as? ITabsVC)?.switchToExplore()

        val window = host.window ?: return
        val inAppBrowserVC =
            InAppBrowserVC(
                host.context,
                host.navigationController?.tabBarController,
                InAppBrowserConfig(
                    url = url,
                    title = title,
                    injectDappConnect = true,
                    saveInVisitedHistory = true,
                )
            )
        val nav = WNavigationController(window)
        nav.setRoot(inAppBrowserVC)
        window.present(nav)
    }
}
