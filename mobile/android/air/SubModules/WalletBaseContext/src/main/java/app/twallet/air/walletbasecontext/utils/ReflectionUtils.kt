package app.twallet.air.walletbasecontext.utils

import java.lang.reflect.Field

@Throws(NoSuchFieldException::class)
fun Class<*>.getPrivateField(fieldName: String): Field =
    getDeclaredField(fieldName).apply { isAccessible = true }
