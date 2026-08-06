package app.twallet.air.uisettings.viewControllers.connectedApps

import android.view.ViewGroup
import app.twallet.air.uicomponents.adapter.BaseListHolder
import app.twallet.air.uisettings.viewControllers.connectedApps.cells.ConnectedAppsCell

class HolderConnectedAppsCell(
    parent: ViewGroup,
    val onDisconnect: (Item.DApp) -> Unit,
    val onWarning: (Item.DApp) -> Unit
) : BaseListHolder<Item.DApp>(ConnectedAppsCell(parent.context)) {
    val cell = itemView as ConnectedAppsCell

    override fun onBind(item: Item.DApp) {
        cell.configure(
            item.app,
            item.isLastItem,
            onDisconnect = { onDisconnect.invoke(item) },
            onWarning = if (item.app.shouldShowurlTrustStatusWarning()) {
                { onWarning.invoke(item) }
            } else null
        )
    }
}
