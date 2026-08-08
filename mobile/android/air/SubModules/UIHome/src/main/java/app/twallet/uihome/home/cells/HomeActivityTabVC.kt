package app.twallet.uihome.home.cells

import android.content.Context
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.walletbasecontext.localization.LocaleController

/**
 * Zero-height peer tab; the real activity feed stays in ActivityListView's TRANSACTION_SECTION.
 */
class HomeActivityTabVC(context: Context) : WViewController(context) {
    override val TAG = "HomeActivityTab"

    override var title: String?
        get() = LocaleController.getString("Activity")
        set(_) {}

    override fun setupViews() {
        super.setupViews()
    }
}
