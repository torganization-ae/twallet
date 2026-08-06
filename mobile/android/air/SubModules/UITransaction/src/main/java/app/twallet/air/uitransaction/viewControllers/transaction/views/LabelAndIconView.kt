package app.twallet.air.uitransaction.viewControllers.transaction.views

import android.content.Context
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.image.Content
import app.twallet.air.uicomponents.image.WCustomImageView
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WView

class LabelAndIconView(context: Context) : WView(context) {

    val lbl = WLabel(context)
    val img = WCustomImageView(context).apply {
        chainSize = 10.dp
    }

    override fun setupViews() {
        super.setupViews()

        addView(lbl, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        addView(img, LayoutParams(30.dp, 30.dp))

        setConstraints {
            toStart(lbl)
            toCenterY(lbl)
            startToEnd(img, lbl, 8f)
            toBottom(img, 6f)
            toEnd(img)
        }
    }

    fun configure(text: CharSequence, content: Content) {
        lbl.text = text
        img.set(content)
    }
}
