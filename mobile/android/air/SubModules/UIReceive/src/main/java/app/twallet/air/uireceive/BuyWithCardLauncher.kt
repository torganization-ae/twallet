package app.twallet.air.uireceive

import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uiinappbrowser.CustomTabsBrowser
import app.twallet.air.walletbasecontext.models.MBaseCurrency
import app.twallet.air.walletbasecontext.theme.ThemeManager
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.models.MBridgeError
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.moshi.api.ApiMethod
import app.twallet.air.walletcore.stores.AccountStore
import app.twallet.air.walletcore.stores.ConfigStore
import java.lang.ref.WeakReference

object BuyWithCardLauncher {

    fun preferredBaseCurrency(chain: String): MBaseCurrency {
        val baseCurrencies = supportedBaseCurrencies(chain)
        val preferred = if (ConfigStore.countryCode == "RU")
            MBaseCurrency.RUB
        else
            WalletCore.baseCurrency
        return if (baseCurrencies.contains(preferred)) preferred else MBaseCurrency.USD
    }

    fun supportedBaseCurrencies(chain: String): List<MBaseCurrency> {
        return listOfNotNull(
            MBaseCurrency.USD,
            MBaseCurrency.EUR,
            if (chain == MBlockchain.ton.name) MBaseCurrency.RUB else null
        )
    }

    fun buyWithCardUrl(
        chain: String,
        baseCurrency: MBaseCurrency,
        onReceive: (url: String?) -> Unit
    ) {
        when (baseCurrency) {
            MBaseCurrency.RUB -> {
                val address = AccountStore.activeAccount?.tonAddress ?: ""
                onReceive("https://dreamwalkers.io/ru/mytonwallet/?wallet=$address&give=CARDRUB&take=TON&type=buy")
            }

            MBaseCurrency.USD, MBaseCurrency.EUR -> {
                val activeTheme = if (ThemeManager.isDark) "dark" else "light"
                WalletCore.call(
                    ApiMethod.Other.GetMoonpayOnrampUrl(
                        ApiMethod.Other.GetMoonpayOnrampUrl.Params(
                            chain = chain,
                            addressByChain = AccountStore.activeAccount?.addressByChain ?: emptyMap(),
                            theme = activeTheme,
                            currency = baseCurrency.currencyCode
                        )
                    )
                ) { result, _ ->
                    onReceive(result?.url)
                }
            }

            else -> {}
        }
    }

    fun launch(
        caller: WeakReference<WViewController>,
        chain: String,
    ) {
        buyWithCardUrl(chain, preferredBaseCurrency(chain)) { url ->
            val context = caller.get()?.context
            if (context != null && url != null) {
                CustomTabsBrowser.open(context, url)
            } else {
                caller.get()?.showError(MBridgeError.SERVER_ERROR)
            }
        }
    }
}