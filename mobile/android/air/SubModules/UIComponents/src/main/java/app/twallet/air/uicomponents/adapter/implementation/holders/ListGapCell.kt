package app.twallet.air.uicomponents.adapter.implementation.holders

import android.content.Context
import android.view.View
import android.view.ViewGroup
import app.twallet.air.uicomponents.adapter.BaseListHolder
import app.twallet.air.uicomponents.adapter.implementation.Item
import app.twallet.air.uicomponents.extensions.dp

class ListGapCell(context: Context, gap: Int = 12.dp) : View(context) {

    init {
        layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, gap)
    }

    fun configure(item: Item.Gap) {
        if (layoutParams.height == item.height) {
            return
        }
        layoutParams = layoutParams.apply {
            height = item.height
        }
        requestLayout()
    }

    class Holder(parent: ViewGroup) : BaseListHolder<Item.Gap>(ListGapCell(parent.context)) {

        private val view = itemView as ListGapCell

        override fun onBind(item: Item.Gap) {
            view.configure(item)
        }
    }
}
