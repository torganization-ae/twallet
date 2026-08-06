package app.twallet.air.uiagent.viewControllers.agent.cells

import android.annotation.SuppressLint
import android.content.Context
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import app.twallet.air.uiagent.viewControllers.agent.AgentMessage
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

@SuppressLint("ViewConstructor")
class AgentSystemMessageCell(context: Context) : WCell(
    context, LayoutParams(MATCH_PARENT, WRAP_CONTENT)
) {
    private val label = WLabel(context).apply {
        setStyle(11f, WFont.Medium)
        setTextColor(WColor.SecondaryText.color)
        gravity = Gravity.CENTER
        maxLines = 2
        isSingleLine = false
        useCustomEmoji = true
    }

    init {
        addView(label)
        setConstraints {
            toTop(label, 4f)
            toBottom(label, 4f)
            toStart(label, 40f)
            toEnd(label, 40f)
        }
    }

    fun configure(message: AgentMessage) {
        label.text = message.text
    }
}
