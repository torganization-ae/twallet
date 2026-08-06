package app.twallet.air.uitonconnect.viewControllers.send.adapter

import android.view.View
import android.view.ViewGroup
import app.twallet.air.uicomponents.adapter.BaseListHolder
import app.twallet.air.uicomponents.adapter.BaseListItem
import app.twallet.air.uicomponents.adapter.implementation.CustomListAdapter
import app.twallet.air.uicomponents.commonViews.WAddressActionView
import app.twallet.air.uitonconnect.viewControllers.send.adapter.holder.CellAddressAction
import app.twallet.air.uitonconnect.viewControllers.send.adapter.holder.CellHeaderSendRequest
import app.twallet.air.uitonconnect.viewControllers.send.commonViews.TotalCurrencyAmountView

class Adapter : CustomListAdapter() {
    var onAddressClick: ((View, WAddressActionView, TonConnectItem.Address) -> Unit)? = null

    override fun createHolder(parent: ViewGroup, viewType: Int): BaseListHolder<out BaseListItem> {
        return when (viewType) {
            TonConnectItem.Type.SEND_HEADER.value -> CellHeaderSendRequest.Holder(parent)
            TonConnectItem.Type.AMOUNT.value -> TotalCurrencyAmountView.Holder(parent)
            TonConnectItem.Type.ADDRESS.value -> CellAddressAction.Holder(parent) { anchorView, view, item ->
                onAddressClick?.invoke(anchorView, view, item)
            }

            else -> super.createHolder(parent, viewType)
        }
    }
}
