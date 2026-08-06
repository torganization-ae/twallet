package app.twallet.air.uisend.send.helpers

import android.text.Spannable
import android.text.style.ForegroundColorSpan
import app.twallet.air.uicomponents.helpers.spans.WClickableSpan
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletbasecontext.R as BaseR
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.utils.ApplicationContextHolder
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.toProcessedSpannableStringBuilder
import app.twallet.air.walletcore.TRON_SLUG
import app.twallet.air.walletcore.TRON_USDT_SLUG
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.WalletEvent
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.stores.AccountStore
import app.twallet.air.walletcore.stores.BalanceStore
import app.twallet.air.walletcore.stores.TokenStore
import java.math.BigInteger

class ScamDetectionHelpers {
    companion object {
        const val HOUR = 60 * 60 * 1000

        private val SCAM_DOMAIN_ADDRESS_REGEX = Regex("""^[-\w]{26,}\.""")

        fun shouldShowDomainScamWarning(address: String): Boolean {
            return SCAM_DOMAIN_ADDRESS_REGEX.containsMatchIn(address)
        }

        fun shouldShowSeedPhraseScamWarning(
            transferTokenChain: MBlockchain
        ): Boolean {
            val account = AccountStore.activeAccount ?: return false

            // Only check for recently imported accounts (within 1 hour)
            val importedAt = account.importedAt
            if (importedAt == null || System.currentTimeMillis() - importedAt > HOUR) {
                return false
            }

            // Only show when trying to transfer TRON tokens
            if (transferTokenChain != MBlockchain.tron) {
                return false
            }

            // Check if account has TRON tokens (like USDT)
            val hasTronTokens = BalanceStore.getBalances(account.accountId)?.any { balance ->
                if (balance.key == TRON_USDT_SLUG)
                    return@any true
                val token = TokenStore.getToken(balance.key) ?: return false
                return@any (token.slug != TRON_SLUG && token.mBlockchain == MBlockchain.tron && balance.value > BigInteger.ZERO)
            } ?: false

            return hasTronTokens
        }

        private fun seedScamHelpUrl(): String {
            val ctx = ApplicationContextHolder.applicationContext
            val lang = WGlobalStorage.getLangCode()
            val resId = if (lang == "ru") BaseR.string.app_help_scam_url_ru
            else BaseR.string.app_help_scam_url_en
            return ctx.getString(resId)
                .ifEmpty { ctx.getString(BaseR.string.app_help_scam_url_en) }
        }

        private fun domainScamHelpUrl(): String {
            val ctx = ApplicationContextHolder.applicationContext
            val lang = WGlobalStorage.getLangCode()
            val resId = if (lang == "ru") BaseR.string.app_help_domain_scam_url_ru
            else BaseR.string.app_help_domain_scam_url_en
            return ctx.getString(resId)
                .ifEmpty { ctx.getString(BaseR.string.app_help_domain_scam_url_en) }
        }

        fun scamWarningMessage(): CharSequence {
            return buildScamWarningMessage("\$seed_phrase_scam_warning", seedScamHelpUrl())
        }

        fun domainScamWarningMessage(): CharSequence {
            return buildScamWarningMessage("\$domain_like_scam_warning", domainScamHelpUrl())
        }

        private fun buildScamWarningMessage(
            messageKey: String,
            helpCenterUrl: String
        ): CharSequence {
            val helpCenterString = LocaleController.getString("Help Center")
            val spannable =
                LocaleController.getString(messageKey)
                    .replace("%help_center_link%", helpCenterString)
                    .toProcessedSpannableStringBuilder()

            val helpCenterRegex = Regex(helpCenterString)
            val matches = helpCenterRegex.findAll(spannable)
            for (match in matches) {
                val start = match.range.first
                val end = match.range.last + 1

                spannable.setSpan(
                    ForegroundColorSpan(WColor.Tint.color),
                    start,
                    end,
                    Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
                )
                spannable.setSpan(
                    WClickableSpan(helpCenterUrl) {
                        if (helpCenterUrl.isNotEmpty())
                            WalletCore.notifyEvent(WalletEvent.OpenUrl(helpCenterUrl))
                    },
                    start,
                    end,
                    Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
                )
            }

            return spannable
        }
    }
}
