package app.twallet.air.uicomponents.adapter.implementation.holders

import android.util.TypedValue
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.view.ViewGroup
import android.widget.FrameLayout
import app.twallet.air.uicomponents.adapter.BaseListHolder
import app.twallet.air.uicomponents.adapter.implementation.Item
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.uicomponents.widgets.CopyTextView
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

class ListTextCellHolder(parent: ViewGroup) :
    BaseListHolder<Item.CopyableText>(FrameLayout(parent.context)) {

    private val container: FrameLayout = itemView as FrameLayout
    private val copyTextView: CopyTextView = CopyTextView(parent.context)

    init {
        container.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
        container.setPaddingDp(16, 6, 16, 18)

        copyTextView.layoutParams = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
        copyTextView.setLineHeight(TypedValue.COMPLEX_UNIT_SP, 24f)
        copyTextView.setTextSize(TypedValue.COMPLEX_UNIT_SP, adaptiveFontSize())
        copyTextView.includeFontPadding = false

        container.addView(copyTextView)
    }

    override fun onBind(item: Item.CopyableText) {
        copyTextView.text = item.address
        copyTextView.typeface = WFont.Regular.typeface
        copyTextView.setTextColor(WColor.PrimaryText.color)
        copyTextView.clipLabel = item.copyLabel
        copyTextView.clipToast = item.copyToast
    }
}
