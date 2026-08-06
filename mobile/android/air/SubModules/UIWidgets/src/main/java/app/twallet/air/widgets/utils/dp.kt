package app.twallet.air.widgets.utils

import app.twallet.air.walletbasecontext.utils.ApplicationContextHolder
import kotlin.math.roundToInt

val Int.dp get() = (this * ApplicationContextHolder.density).roundToInt()
val Float.dp get() = this * ApplicationContextHolder.density
