package app.twallet.air.uitonconnect.viewControllers.send.adapter.holder

import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import app.twallet.air.uicomponents.adapter.BaseListHolder
import app.twallet.air.uicomponents.commonViews.WAddressActionView
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uitonconnect.viewControllers.send.adapter.TonConnectItem

class CellAddressAction {
    class Holder(
        parent: ViewGroup,
        onClickAddress: (View, WAddressActionView, TonConnectItem.Address) -> Unit
    ) : BaseListHolder<TonConnectItem.Address>(
        FrameLayout(parent.context).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
    ) {
        private val view = WAddressActionView(parent.context)

        private val container = (itemView as FrameLayout).apply {
            addView(
                view, FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(12.dp, 4.dp, 12.dp, 12.dp)
                }
            )
        }

        init {
            view.onTap = { tappedView, _ ->
                item?.let { onClickAddress(container, tappedView, it) }
            }
        }

        override fun onBind(item: TonConnectItem.Address) {
            view.configure(
                WAddressActionView.Data(
                    address = item.address,
                    chain = item.chain,
                    addressName = item.addressName
                )
            )
        }
    }
}
