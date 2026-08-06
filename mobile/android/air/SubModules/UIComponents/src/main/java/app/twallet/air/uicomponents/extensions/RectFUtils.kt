package app.twallet.air.uicomponents.extensions

import android.graphics.RectF
import app.twallet.air.walletbasecontext.localization.LocaleController

fun RectF.setLocalized(start: Float, top: Float, end: Float, bottom: Float) {
    set(
        if (LocaleController.isRTL) end else start,
        top,
        if (LocaleController.isRTL) start else end,
        bottom
    )
}
