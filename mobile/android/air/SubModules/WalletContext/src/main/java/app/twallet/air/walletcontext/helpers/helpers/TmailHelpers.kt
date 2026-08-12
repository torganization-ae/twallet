package app.twallet.air.walletcontext.helpers

import android.net.Uri

// Tmail alias detection helpers. Kept separate from DNSHelpers so the two detectors don't mix.
object TmailHelpers {

    private const val TMAIL_DOMAIN_SUFFIX = "@tmail.ton"
    private const val TMAIL_SHARE_PATH = "/share/"
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

    /**
     * Mailbox carried by a TMail share QR: `https://<any-host>/share/<url-encoded mailbox>`.
     * The host is not checked — dev/staging/prod hosts all differ.
     */
    fun parseShareQr(raw: String): String? {
        val trimmed = raw.trim()
        val markerIndex = trimmed.indexOf(TMAIL_SHARE_PATH)
        if (markerIndex < 0) return null

        // `#` and `@` of a web3 mailbox are percent-encoded in the QR, so cut the tail off before decoding.
        val encoded = trimmed.substring(markerIndex + TMAIL_SHARE_PATH.length)
            .substringBefore('?').substringBefore('#').substringBefore('/')
        // Uri.decode, not URLDecoder — the latter would turn a `+` in the alias into a space.
        val mailbox = Uri.decode(encoded)?.trim() ?: return null

        return if (mailbox.contains('@')) mailbox else null
    }

    /** Bare local-part alias (no `.` / `@`) that can be resolved as `@tmail.ton` then `.ton` DNS. */
    fun isBareTonAlias(value: String): Boolean {
        val trimmed = value.trim().lowercase()
        if (trimmed.isEmpty() || trimmed.contains('.') || trimmed.contains('@')) return false

        return TMAIL_ALIAS_REGEX.matches(trimmed)
    }
}
