package app.twallet.air.uicomponents.extensions

import android.util.TypedValue
import app.twallet.air.walletbasecontext.utils.ApplicationContextHolder
import kotlin.math.roundToInt

val Int.dp get() = (this * ApplicationContextHolder.density).roundToInt()
val Float.dp get() = this * ApplicationContextHolder.density
val Float.sp
    get() = TypedValue.applyDimension(
        TypedValue.COMPLEX_UNIT_SP,
        this,
        ApplicationContextHolder.applicationContext.resources.displayMetrics
    )
