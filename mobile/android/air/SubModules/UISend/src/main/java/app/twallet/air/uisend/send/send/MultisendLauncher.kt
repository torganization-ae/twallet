package app.twallet.air.uisend.send

import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uiinappbrowser.InAppBrowserVC
import app.twallet.air.walletbasecontext.R as BaseR
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletcore.helpers.SubprojectHelpers
import app.twallet.air.walletcore.models.InAppBrowserConfig

object MultisendLauncher {
    fun launch(
        caller: WViewController,
    ) {
        val window = caller.window ?: return
        val multisendUrl = caller.view.context.getString(BaseR.string.app_multisend_url)
        if (multisendUrl.isEmpty()) return
        val url = SubprojectHelpers.appendSubprojectContext(multisendUrl)

        val nav = WNavigationController(
            window,
            WNavigationController.PresentationConfig.PreferredFullScreen
        )
        val browserVC = InAppBrowserVC(
            caller.view.context,
            null,
            InAppBrowserConfig(
                url = url,
                title = LocaleController.getString("Multisend"),
                injectDappConnect = true,
                injectDarkModeStyles = true,
                topBarColorMode = InAppBrowserConfig.TopBarColorMode.SYSTEM,
                forceCloseOnBack = true,
                allowDownloads = true,
            )
        )
        nav.setRoot(browserVC)
        window.present(nav)
    }
}
