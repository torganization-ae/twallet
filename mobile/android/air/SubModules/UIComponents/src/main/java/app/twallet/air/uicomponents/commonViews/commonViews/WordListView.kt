package app.twallet.air.uicomponents.commonViews

import android.annotation.SuppressLint
import android.content.Context
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.walletbasecontext.utils.ceilToInt

@SuppressLint("ViewConstructor")
class WordListView(context: Context) : WView(context) {

    fun setupViews(words: List<String>) {
        if (words.isEmpty())
            return

        val rowsCount = (words.size / 2.0).ceilToInt()

        // To increase performance, decided to use a single view for each row, totally 4 text views!
        if (words.size > 1) {
            var leftIndexes = ""
            var leftWords = ""
            var rightIndexes = ""
            var rightWords = ""
            words.forEachIndexed { index, word ->
                if (index < rowsCount) {
                    leftIndexes += "\n${index + 1}."
                    leftWords += "\n$word"
                } else {
                    rightIndexes += "\n${index + 1}."
                    rightWords += "\n$word"
                }
            }
            val leftWordItemView = WordListItemView(context)
            leftWordItemView.setupViews(leftIndexes.substring(1), leftWords.substring(1))
            val rightWordItemView = WordListItemView(context)
            rightWordItemView.setupViews(rightIndexes.substring(1), rightWords.substring(1))

            addView(leftWordItemView, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
            addView(rightWordItemView, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))

            setConstraints {
                toTop(leftWordItemView)
                toStart(leftWordItemView)
                startToEnd(rightWordItemView, leftWordItemView, 48f)
                toTop(rightWordItemView)
                toEnd(rightWordItemView)
            }
        } else {
            val privateKeyLabel = WLabel(context).apply {
                setLineSpacing(4f.dp, 1f)
                setStyle(17f, WFont.Medium)
            }
            privateKeyLabel.text = words.first()
            addView(privateKeyLabel, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
            setConstraints {
                constrainedWidth(privateKeyLabel.id, true)
                toCenterY(privateKeyLabel)
                toCenterX(privateKeyLabel, 24f)
            }
        }
    }
}
