package app.twallet.air.walletcore.models.blockchain

import androidx.core.graphics.toColorInt
import app.twallet.air.walletcontext.models.MBlockchainNetwork
import java.math.BigDecimal

object BaseConfig : MBlockchainConfig {

    override val gas = MBlockchain.Gas(
        maxSwap = null,
        maxTransfer = BigDecimal.ZERO,
        maxTransferToken = BigDecimal.ZERO
    )

    override val symbolIcon = app.twallet.air.icons.R.drawable.ic_symbol_base
    override val symbolIconPadded = app.twallet.air.icons.R.drawable.ic_symbol_base
    override val receiveOrnamentImage =
        app.twallet.air.icons.R.drawable.receive_ornament_base_light

    override val qrIcon = app.twallet.air.icons.R.drawable.ic_blockchain_base_128_qr
    override val displayColor = "#0052FF".toColorInt()
    override val qrGradientColors = intArrayOf(
        "#424DB8".toColorInt(),
        "#2050A1".toColorInt(),
    )

    override val feeCheckAddress = "0x0000000000000000000000000000000000000000"

    override val isCommentSupported = false
    override val isEncryptedCommentSupported = false

    override val burnAddress = null
    override val multiWalletSupport = MultiWalletSupport.PATH

    override val chainStandard = "ethereum"
    override val defaultDerivationPath = "m/44'/60'/0'/0/{index}"
    override val walletConnectChainIds = mapOf(
        MBlockchainNetwork.MAINNET to 8453,
        MBlockchainNetwork.TESTNET to 84532,
    )

    override fun isValidAddress(address: String): Boolean =
        Regex("""^0x[a-fA-F0-9]{40}$""").matches(address)

    override fun idToTxHash(id: String?): String? =
        id?.substringBefore(":")

    override fun transactionExplorers() =
        listOf(MBlockchainExplorer.BASESCAN)

    override fun addressExplorers() =
        listOf(MBlockchainExplorer.BASESCAN)

    override fun tokenExplorer() =
        MBlockchainExplorer.BASESCAN

    override fun nftExplorer() =
        MBlockchainExplorer.BASESCAN
}
