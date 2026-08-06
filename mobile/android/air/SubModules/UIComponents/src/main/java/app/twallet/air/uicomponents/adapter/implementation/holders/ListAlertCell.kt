package app.twallet.air.uicomponents.adapter.implementation.holders

import android.content.Context
import android.view.ViewGroup
import app.twallet.air.uicomponents.adapter.BaseListHolder
import app.twallet.air.uicomponents.adapter.implementation.Item
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.WAlertLabel
import app.twallet.air.uicomponents.widgets.WThemedView

class ListAlertCell(context: Context) : WAlertLabel(
    context = context,
    coloredText = true,
    rounding = 16f.dp
), WThemedView {
    init {
        layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
    }

    class Holder(parent: ViewGroup) :
        BaseListHolder<Item.Alert>(ListAlertCell(parent.context)) {
        private val view = itemView as ListAlertCell
        override fun onBind(item: Item.Alert) {
            view.text = item.text
        }
    }
}
