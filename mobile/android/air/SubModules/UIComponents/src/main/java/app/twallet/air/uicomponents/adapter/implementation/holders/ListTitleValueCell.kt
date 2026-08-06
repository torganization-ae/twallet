package app.twallet.air.uicomponents.adapter.implementation.holders

import android.content.Context
import android.graphics.Color
import android.text.method.LinkMovementMethod
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import app.twallet.air.uicomponents.adapter.BaseListHolder
import app.twallet.air.uicomponents.adapter.implementation.Item
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.theme.WColor

class ListTitleValueCell(context: Context) : FrameLayout(context), WThemedView {

    private val titleView = WLabel(context).apply {
        isSingleLine = true
        maxLines = 1
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 24f)
        setStyle(14f, WFont.Medium)
        setTextColor(WColor.Tint)
        movementMethod = LinkMovementMethod.getInstance()
        highlightColor = Color.TRANSPARENT
        useCustomEmoji = true
    }

    private val valueView = WLabel(context).apply {
        isSingleLine = true
        maxLines = 1
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 24f)
        setStyle(14f, WFont.Regular)
        setTextColor(WColor.SecondaryText)
        useCustomEmoji = true
    }

    init {
        setPaddingDp(20f, 17f, 20f, 0f)
        layoutParams = ViewGroup.LayoutParams(LayoutParams.MATCH_PARENT, 40.dp)
        addView(
            titleView, LayoutParams(
                LayoutParams.WRAP_CONTENT,
                LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.LEFT
            }
        )
        addView(
            valueView, LayoutParams(
                LayoutParams.WRAP_CONTENT,
                LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.RIGHT
            }
        )
        updateTheme()
    }

    fun setTitle(text: CharSequence?) {
        titleView.text = text
    }

    fun setValue(text: CharSequence?) {
        valueView.text = text
    }

    override fun updateTheme() {
        titleView.updateTheme()
        valueView.updateTheme()
    }

    class Holder(parent: ViewGroup) :
        BaseListHolder<Item.ListTitleValue>(ListTitleValueCell(parent.context)) {

        private val cell = itemView as ListTitleValueCell

        override fun onBind(item: Item.ListTitleValue) {
            cell.setTitle(item.title)
            cell.setValue(item.value)

            cell.updateTheme()
        }
    }
}
