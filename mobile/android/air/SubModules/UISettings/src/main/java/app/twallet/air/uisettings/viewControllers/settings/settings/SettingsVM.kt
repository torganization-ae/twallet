package app.twallet.air.uisettings.viewControllers.settings

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uisettings.R
import app.twallet.air.uisettings.viewControllers.settings.cells.SettingsAccountCell
import app.twallet.air.uisettings.viewControllers.settings.cells.SettingsItemCell
import app.twallet.air.uisettings.viewControllers.settings.cells.SettingsVersionCell
import app.twallet.air.uisettings.viewControllers.settings.models.SettingsItem
import app.twallet.air.uisettings.viewControllers.settings.models.SettingsSection
import app.twallet.air.uisettings.viewControllers.settings.views.SettingsHeaderView
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.stores.AccountStore
import app.twallet.air.walletcore.stores.DappsStore

class SettingsVM {

    private var fillAccountsJob: Job? = null

    val settingsSections = listOf(
        SettingsSection(
            section = SettingsSection.Section.ACCOUNTS,
            title = LocaleController.getString("Wallets"),
            children = emptyList()
        ),
        SettingsSection(
            section = SettingsSection.Section.PORTFOLIO,
            title = "",
            children = listOf(
                SettingsItem(
                    identifier = SettingsItem.Identifier.PORTFOLIO,
                    icon = R.drawable.ic_portfolio,
                    title = LocaleController.getString("Portfolio"),
                    subtitle = LocaleController.getString("Performance, insights and P&L"),
                    hasTintColor = false
                )
            )
        ),
        SettingsSection(
            section = SettingsSection.Section.SETTINGS,
            title = LocaleController.getString("Settings"),
            children = emptyList()
        ),
    )

    fun subtitleFor(item: SettingsItem): String? {
        // Check if there's a cached value and return it if available
        item.subtitle?.let {
            return it
        }

        // Determine the value based on the item's identifier
        return when (item.identifier) {
            SettingsItem.Identifier.LANGUAGE -> LocaleController.activeLanguage.englishName
            SettingsItem.Identifier.WALLET_VERSIONS -> AccountStore.walletVersionsData?.currentVersion
            SettingsItem.Identifier.CONNECTED_APPS -> LocaleController.getPlural(
                DappsStore.dApps[AccountStore.activeAccountId]?.size ?: 0, "\$connected_apps"
            )

            else -> null
        }
    }

    fun fillOtherAccounts(async: Boolean, onComplete: (() -> Unit)? = null) {
        val accountsSectionIndex =
            settingsSections.indexOfFirst { it.section == SettingsSection.Section.ACCOUNTS }
        if (accountsSectionIndex == -1) return

        if (async) {
            fillAccountsJob?.cancel()
            fillAccountsJob = CoroutineScope(Dispatchers.Main).launch {
                val items = withContext(Dispatchers.Default) {
                    buildAccountItems()
                }
                settingsSections[accountsSectionIndex].children = items
                onComplete?.invoke()
            }
        } else {
            settingsSections[accountsSectionIndex].children = buildAccountItems()
            onComplete?.invoke()
        }
    }

    private fun buildAccountItems(): List<SettingsItem> {
        val items = mutableListOf<SettingsItem>()
        val allAccountsExceptActive =
            WalletCore.getAllAccounts().filter { it.accountId != AccountStore.activeAccountId }
        val firstAccounts =
            allAccountsExceptActive.take(if (allAccountsExceptActive.size > 6) 5 else 6)
        for (account in firstAccounts) {
            if (account.accountId == AccountStore.activeAccountId) continue

            items.add(
                SettingsItem(
                    identifier = SettingsItem.Identifier.ACCOUNT,
                    icon = null,
                    title = account.name,
                    value = null,
                    hasTintColor = false,
                    account = account
                )
            )
        }

        if (firstAccounts.size != allAccountsExceptActive.size) {
            items.add(
                SettingsItem(
                    identifier = SettingsItem.Identifier.SHOW_ALL_WALLETS,
                    icon = R.drawable.ic_show_all,
                    title = LocaleController.getString("Show All Wallets"),
                    value = null,
                    hasTintColor = true,
                )
            )
        }

        items.add(
            SettingsItem(
                identifier = SettingsItem.Identifier.ADD_ACCOUNT,
                icon = R.drawable.ic_add,
                title = LocaleController.getString("Add Wallet"),
                hasTintColor = true
            )
        )

        return items
    }

    fun updateSettingsSection() {
        val walletConfigSectionIndex =
            settingsSections.indexOfFirst { it.section == SettingsSection.Section.SETTINGS }
        if (walletConfigSectionIndex == -1) return
        val currentAccountSupportsSubWallets = AccountStore.currentAccountSupportsSubWallets()

        val items = listOfNotNull(
            SettingsItem(
                identifier = SettingsItem.Identifier.APPEARANCE,
                icon = R.drawable.ic_appearance,
                title = LocaleController.getString("Appearance"),
                subtitle = LocaleController.getString("Night Mode, Palette"),
                hasTintColor = false
            ),
            if (WGlobalStorage.isPasscodeSet())
                SettingsItem(
                    identifier = SettingsItem.Identifier.SECURITY,
                    icon = R.drawable.ic_backup,
                    title = LocaleController.getString("Security"),
                    subtitle = LocaleController.getString("Back Up, Passcode, Auto-Lock"),
                    hasTintColor = false
                )
            else null,
            SettingsItem(
                identifier = SettingsItem.Identifier.ASSETS_AND_ACTIVITY,
                icon = R.drawable.ic_assets_activities,
                title = LocaleController.getString("Assets & Activity"),
                subtitle = LocaleController.getString("Base Currency, Token Order, Hidden NFTs"),
                hasTintColor = false
            ),
            if (currentAccountSupportsSubWallets)
                SettingsItem(
                    identifier = SettingsItem.Identifier.SUBWALLETS,
                    icon = R.drawable.ic_subwallets,
                    title = LocaleController.getString("Subwallets"),
                    subtitle = LocaleController.getString("Other addresses for this wallet"),
                    hasTintColor = false
                )
            else null,
            if (AccountStore.walletVersionsData?.versions?.isNotEmpty() == true)
                SettingsItem(
                    identifier = SettingsItem.Identifier.WALLET_VERSIONS,
                    icon = R.drawable.ic_versions,
                    title = LocaleController.getString("Wallet Versions"),
                    subtitle = LocaleController.getString("Your assets on other TON contracts"),
                    hasTintColor = false
                )
            else null,
            if (DappsStore.dApps[AccountStore.activeAccountId]?.isNotEmpty() == true)
                SettingsItem(
                    identifier = SettingsItem.Identifier.CONNECTED_APPS,
                    icon = R.drawable.ic_apps,
                    title = LocaleController.getString("Connected Apps"),
                    hasTintColor = false,
                )
            else null,
            SettingsItem(
                identifier = SettingsItem.Identifier.NOTIFICATION_SETTINGS,
                icon = R.drawable.ic_notifications,
                title = LocaleController.getString("Sounds"),
                hasTintColor = false
            ),
            SettingsItem(
                identifier = SettingsItem.Identifier.LANGUAGE,
                icon = R.drawable.ic_language,
                title = LocaleController.getString("Language"),
                hasTintColor = false
            )
        )

        settingsSections[walletConfigSectionIndex].children = items
    }

    fun contentHeight(): Int {
        var sum = SettingsHeaderView.HEIGHT_NORMAL.dp
        settingsSections.forEach { section ->
            if (section.title.isNotEmpty()) {
                sum += SECTION_HEADER_HEIGHT.dp
            }
            section.children.forEachIndexed { index, item ->
                val isLast = index == section.children.size - 1
                sum += when (item.identifier) {
                    SettingsItem.Identifier.ACCOUNT -> SettingsAccountCell.heightForItem(isLast)
                    else -> SettingsItemCell.cellHeightForItem(
                        isSubtitled = !subtitleFor(item).isNullOrEmpty(),
                        isLast = isLast
                    )
                }
            }
        }
        sum += SettingsVersionCell.HEIGHT.dp
        return sum
    }

    companion object {
        private const val SECTION_HEADER_HEIGHT = 40
    }
}
