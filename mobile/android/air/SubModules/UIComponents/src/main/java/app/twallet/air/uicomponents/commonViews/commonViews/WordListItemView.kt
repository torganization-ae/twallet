package app.twallet.air.uicomponents.commonViews

import android.content.Context
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.ceilToInt

class WordListItemView(
    context: Context,
) : WView(context), WThemedView {

    private val indexLabel: WLabel by lazy {
        val lbl = WLabel(context)
        lbl.setLineSpacing(4f.dp, 1f)
        lbl.setStyle(17F)
        lbl
    }

    private val wordLabel: WLabel by lazy {
        val lbl = WLabel(context)
        lbl.setLineSpacing(4f.dp, 1f)
        lbl.setStyle(17F, WFont.Medium)
        lbl.gravity = Gravity.LEFT
        lbl
    }

    fun setupViews(index: String, word: String) {
        addView(
            indexLabel,
            LayoutParams(indexLabel.paint.measureText("88.").ceilToInt(), WRAP_CONTENT)
        )
        addView(wordLabel, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        setConstraints {
            toTop(indexLabel)
            toStart(indexLabel)
            toTop(wordLabel)
            toEnd(wordLabel)
            startToEnd(wordLabel, indexLabel, 4F)
        }

        indexLabel.text = index
        wordLabel.text = word

        updateTheme()
    }

    override fun updateTheme() {
        indexLabel.setTextColor(WColor.SecondaryText.color)
        wordLabel.setTextColor(WColor.PrimaryText.color)
    }
}
