package app.twallet.air.uicomponents.extensions

import android.graphics.Paint.FontMetrics

fun FontMetrics.getCenterAlignBaseline(y: Float): Float {
    return y - (ascent + descent) / 2f
}
