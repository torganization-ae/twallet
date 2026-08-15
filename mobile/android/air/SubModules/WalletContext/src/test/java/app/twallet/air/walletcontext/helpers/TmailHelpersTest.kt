package app.twallet.air.walletcontext.helpers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TmailHelpersTest {

    // normalizeTmailDomain

    @Test
    fun normalizeRewritesTmailAeToTmailTon() {
        assertEquals("alice@tmail.ton", TmailHelpers.normalizeTmailDomain("alice@tmail.ae"))
        assertEquals("alice@tmail.ton", TmailHelpers.normalizeTmailDomain("Alice@TMail.AE"))
    }

    @Test
    fun normalizeLeavesOtherDomainsUntouched() {
        assertEquals("alice@tmail.ton", TmailHelpers.normalizeTmailDomain(" Alice@Tmail.Ton "))
        assertEquals("example.ton", TmailHelpers.normalizeTmailDomain("example.ton"))
    }

    // isTmailAlias

    @Test
    fun isTmailAliasAcceptsBothTmailTonAndTmailAe() {
        assertTrue(TmailHelpers.isTmailAlias("alice@tmail.ton"))
        assertTrue(TmailHelpers.isTmailAlias("alice@tmail.ae"))
        assertTrue(TmailHelpers.isTmailAlias("Alice@TMail.AE"))
    }

    @Test
    fun isTmailAliasRejectsUnrelatedDomains() {
        assertFalse(TmailHelpers.isTmailAlias("alice@tmail.com"))
        assertFalse(TmailHelpers.isTmailAlias("alice@example.ton"))
    }

    // tmailAliasBase

    @Test
    fun tmailAliasBaseIsSameRegardlessOfSuffix() {
        assertEquals("alice", TmailHelpers.tmailAliasBase("alice@tmail.ton"))
        assertEquals("alice", TmailHelpers.tmailAliasBase("alice@tmail.ae"))
    }

    @Test
    fun tmailAliasBaseRejectsUnrelatedDomains() {
        assertNull(TmailHelpers.tmailAliasBase("alice@tmail.com"))
    }
}
