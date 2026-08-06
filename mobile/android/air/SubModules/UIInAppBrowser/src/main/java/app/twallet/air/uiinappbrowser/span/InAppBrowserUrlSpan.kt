package app.twallet.air.uiinappbrowser.span

import android.text.style.URLSpan
import android.view.View
import app.twallet.air.uicomponents.base.ITabsVC
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WWindow
import app.twallet.air.uiinappbrowser.InAppBrowserVC
import app.twallet.air.walletcore.models.InAppBrowserConfig

class InAppBrowserUrlSpan(
    url: String,
    private val tabBarController: ITabsVC?
) :
    URLSpan(url) {
    override fun onClick(widget: View) {
        val context = widget.context
        val parentWindow = context as? WWindow
            ?: return super.onClick(widget)

        val inAppBrowserVC = InAppBrowserVC(
            context,
            tabBarController,
            InAppBrowserConfig(
                url = url,
                injectDappConnect = true
            )
        )
        val nav = WNavigationController(parentWindow)
        nav.setRoot(inAppBrowserVC)
        parentWindow.present(nav)
    }
}
