package app.twallet.air.uicomponents.extensions

import androidx.constraintlayout.widget.ConstraintLayout
import app.twallet.air.uicomponents.widgets.WConstraintSet


fun ConstraintLayout.constraintSet(): WConstraintSet {
    return WConstraintSet(this)
}

fun ConstraintLayout.setConstraints(block: WConstraintSet.() -> Unit) {
    constraintSet().apply(block).layout()
}
