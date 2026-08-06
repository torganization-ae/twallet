package app.twallet.air.walletcore.api

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import app.twallet.air.walletbasecontext.WBaseStorage
import app.twallet.air.walletbasecontext.models.MBaseCurrency
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.WalletEvent
import app.twallet.air.walletcore.models.MBridgeError
import app.twallet.air.walletcore.stores.BalanceStore

fun WalletCore.setBaseCurrency(
    newBaseCurrency: String,
    callback: (Boolean, MBridgeError?) -> Unit
) {
    if (baseCurrency.currencyCode == newBaseCurrency) {
        callback(true, null)
        return
    }
    WGlobalStorage.clearPriceHistory()
    baseCurrency = MBaseCurrency.valueOf(newBaseCurrency)
    WGlobalStorage.setBaseCurrency(newBaseCurrency)
    WBaseStorage.setBaseCurrency(newBaseCurrency)
    scope.launch {
        BalanceStore.resetBalanceInBaseCurrency()
        withContext(Dispatchers.Main) {
            notifyEvent(WalletEvent.BaseCurrencyChanged)
            callback(true, null)
        }
    }
}
