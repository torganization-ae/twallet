package app.twallet.air.uiassets.viewControllers.icons

import app.twallet.air.uiassets.R
import app.twallet.air.walletcore.models.blockchain.MBlockchainExplorer

val MBlockchainExplorer.menuIconRes: Int?
    get() = when (this) {
        MBlockchainExplorer.TONSCAN -> R.drawable.ic_tonscan
        else -> null
    }
