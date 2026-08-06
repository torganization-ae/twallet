package app.twallet.air.walletsdk

import com.squareup.moshi.Moshi
import app.twallet.air.walletsdk.methods.SDKMoshiBuilder

object WalletSDK {
    val moshi: Moshi by lazy {
        SDKMoshiBuilder.build()
    }
}
