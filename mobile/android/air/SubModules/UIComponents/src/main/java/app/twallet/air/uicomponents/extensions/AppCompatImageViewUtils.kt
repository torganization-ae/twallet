package app.twallet.air.uicomponents.extensions

import android.graphics.drawable.Drawable
import androidx.appcompat.widget.AppCompatImageView
import app.twallet.air.uicomponents.AnimationConstants
import app.twallet.air.uicomponents.widgets.fadeIn
import app.twallet.air.uicomponents.widgets.fadeOut

fun AppCompatImageView.crossFadeImage(newDrawable: Drawable) {
    animate().cancel()
    fadeOut(if (drawable == null) 0 else AnimationConstants.VERY_QUICK_ANIMATION / 2) {
        setImageDrawable(newDrawable)
        fadeIn(AnimationConstants.VERY_QUICK_ANIMATION / 2)
    }
}
