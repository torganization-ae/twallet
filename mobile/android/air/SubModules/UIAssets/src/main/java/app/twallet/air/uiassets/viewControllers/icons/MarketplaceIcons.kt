package app.twallet.air.uiassets.viewControllers.icons

import app.twallet.air.uiassets.R
import app.twallet.air.walletcore.models.MMarketplace

val MMarketplace.menuIconRes: Int?
    get() = when (this) {
        MMarketplace.Fragment -> R.drawable.ic_fragment
        MMarketplace.Getgems -> R.drawable.ic_getgems
        else -> null
    }
