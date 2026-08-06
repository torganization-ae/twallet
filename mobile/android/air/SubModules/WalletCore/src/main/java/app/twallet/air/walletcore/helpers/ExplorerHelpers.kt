package app.twallet.air.walletcore.helpers

import android.net.Uri
import androidx.core.net.toUri
import app.twallet.air.walletbasecontext.utils.ApplicationContextHolder
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.models.MBlockchainNetwork
import app.twallet.air.walletcore.models.IInAppBrowser
import app.twallet.air.walletcore.models.InAppBrowserConfig
import app.twallet.air.walletcore.models.MAccount
import app.twallet.air.walletcore.models.MMarketplace
import app.twallet.air.walletcore.models.blockchain.MBlockchain

class ExplorerHelpers {
    companion object {

        fun createAddressExplorerConfig(
            chain: MBlockchain,
            network: MBlockchainNetwork,
            address: String
        ): InAppBrowserConfig? {
            val explorers = chain.addressExplorers()
            val preferredExplorer = WGlobalStorage.getPreferredExplorer(chain.name)
            val selectedExplorer = explorers.firstOrNull { it.identifier == preferredExplorer }
                ?: explorers.firstOrNull() ?: return null
            val explorerOptions = explorers.map {
                InAppBrowserConfig.Option(
                    identifier = it.identifier,
                    title = it.title,
                    subtitle = it.addressUrl(network, address).toUri().host,
                    onClick = { vc ->
                        (vc.get() as? IInAppBrowser)?.navigate(it.addressUrl(network, address))
                        WGlobalStorage.setPreferredExplorer(chain.name, it.identifier)
                    }
                )
            }
            return InAppBrowserConfig(
                url = selectedExplorer.addressUrl(network, address),
                injectDappConnect = true,
                options = if (explorerOptions.size > 1) explorerOptions else null,
                selectedOption = selectedExplorer.identifier,
                optionsOnTitle = true
            )
        }

        fun createTransactionExplorerConfig(
            chain: MBlockchain,
            network: MBlockchainNetwork,
            txHash: String
        ): InAppBrowserConfig? {
            val explorers = chain.transactionExplorers()
            val preferredExplorer = WGlobalStorage.getPreferredExplorer(chain.name)
            val selectedExplorer = explorers.firstOrNull { it.identifier == preferredExplorer }
                ?: explorers.firstOrNull() ?: return null
            val explorerOptions = explorers.map {
                InAppBrowserConfig.Option(
                    identifier = it.identifier,
                    title = it.title,
                    subtitle = it.transactionUrl(network, txHash).toUri().host,
                    onClick = { vc ->
                        (vc.get() as? IInAppBrowser)?.navigate(it.transactionUrl(network, txHash))
                        WGlobalStorage.setPreferredExplorer(chain.name, it.identifier)
                    }
                )
            }
            return InAppBrowserConfig(
                url = selectedExplorer.transactionUrl(network, txHash),
                injectDappConnect = true,
                options = if (explorerOptions.size > 1) explorerOptions else null,
                selectedOption = selectedExplorer.identifier,
                optionsOnTitle = true
            )
        }

        fun mtwScanUrl(network: MBlockchainNetwork, uriBuilder: Uri.Builder): String {
            uriBuilder
                .scheme("https")
                .authority(ApplicationContextHolder.universalShortUrlHost)
            if (network.isTestnet) {
                uriBuilder.appendQueryParameter("testnet", "true")
            }
            return uriBuilder.build().toString()
        }

        fun getgemsUrl(network: MBlockchainNetwork): String {
            return MMarketplace.Getgems.homeUrl(network)
        }

        fun defaultNftMarketplace(account: MAccount): MMarketplace {
            return MMarketplace.defaultForEmptyAssets(
                account = account,
                isGramWallet = ApplicationContextHolder.isGramApp
            )
        }
    }
}
