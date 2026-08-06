package app.twallet.air.walletcore.moshi.ledger

import com.squareup.moshi.JsonClass
import app.twallet.air.walletcore.models.MAccount
import java.math.BigInteger

@JsonClass(generateAdapter = true)
data class MLedgerWalletInfo(
    val balance: BigInteger,
    val wallet: WalletItem,
    val driver: MAccount.Ledger.Driver,
    val deviceId: String?,
    val deviceName: String?
) {
    @JsonClass(generateAdapter = true)
    data class WalletItem(
        val index: Int,
        val address: String,
        val publicKey: String?,

        val version: String,
        val isInitialized: Boolean?,
        val authToken: String?
    )
}
