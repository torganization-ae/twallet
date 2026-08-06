package app.twallet.air.walletcontext.utils

fun IntRange.shift(offset: Int): IntRange = IntRange(this.first + offset, this.last + offset)
