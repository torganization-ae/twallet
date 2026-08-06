package app.twallet.air.walletbasecontext

import app.twallet.air.walletbasecontext.utils.ApplicationContextHolder


val DEBUG_MODE: Boolean = BuildConfig.DEBUG_MODE

val APP_SCHEME: String by lazy {
    ApplicationContextHolder.applicationContext.getString(R.string.app_url_scheme)
}
val APP_TC_SCHEME: String by lazy {
    ApplicationContextHolder.applicationContext.getString(R.string.app_tc_url_scheme)
}
