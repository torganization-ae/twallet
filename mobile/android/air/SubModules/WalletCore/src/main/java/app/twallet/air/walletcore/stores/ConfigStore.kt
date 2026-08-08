package app.twallet.air.walletcore.stores

import app.twallet.air.walletcontext.WalletContextManager
import app.twallet.air.walletcore.WalletCore

object ConfigStore : IStore {
    var isCopyStorageEnabled: Boolean? = null
        private set
    var supportAccountsCount: Double? = null
        private set
    var isLimited: Boolean? = null
        private set
    var countryCode: String? = null
        private set
    var isAppUpdateRequired: Boolean? = null
        private set
    var swapVersion: Int? = null
        private set

    fun init(configMap: Map<String, Any>?) {
        if (configMap == null) return
        if (configMap["switchToClassic"] as? Boolean == true) {
            WalletCore.switchingToLegacy()
            WalletContextManager.delegate?.get()?.switchToLegacy()
        }
        isCopyStorageEnabled = configMap["isCopyStorageEnabled"] as? Boolean
        supportAccountsCount = configMap["supportAccountsCount"] as? Double
        isLimited = configMap["isLimited"] as? Boolean
        countryCode = configMap["countryCode"] as? String
        isAppUpdateRequired = configMap["isAppUpdateRequired"] as? Boolean
        swapVersion = (configMap["swapVersion"] as? Number)?.toInt()
    }

    override fun wipeData() {
    }

    override fun clearCache() {
    }
}
