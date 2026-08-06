package org.mytonwallet.app_air.walletcontext.helpers

// Tmail alias detection helpers. Kept separate from DNSHelpers so the two detectors don't mix.
object TmailHelpers {

    private const val TMAIL_DOMAIN_SUFFIX = "@tmail.ton"
    private val TMAIL_ALIAS_REGEX = Regex("^[a-z0-9]([-_+a-z0-9]{0,62}[a-z0-9])?$", RegexOption.IGNORE_CASE)

    fun isTmailAlias(value: String): Boolean {
        val trimmed = value.trim().lowercase()
        if (!trimmed.endsWith(TMAIL_DOMAIN_SUFFIX)) return false

        val base = trimmed.dropLast(TMAIL_DOMAIN_SUFFIX.length)
        if (base.isEmpty()) return false

        return TMAIL_ALIAS_REGEX.matches(base)
    }

    fun tmailAliasBase(value: String): String? {
        val trimmed = value.trim().lowercase()
        if (!trimmed.endsWith(TMAIL_DOMAIN_SUFFIX)) return null

        val base = trimmed.dropLast(TMAIL_DOMAIN_SUFFIX.length)
        if (base.isEmpty()) return null

        return if (TMAIL_ALIAS_REGEX.matches(base)) base else null
    }
}
