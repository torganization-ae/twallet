import Foundation
import Testing
import WalletContext

@Suite("Tmail Helpers")
struct TmailHelpersTests {
    @Test
    func `normalizeTmailDomain rewrites the tmail_ae suffix to tmail_ton`() {
        #expect(TmailHelpers.normalizeTmailDomain("alice@tmail.ae") == "alice@tmail.ton")
        #expect(TmailHelpers.normalizeTmailDomain("Alice@TMail.AE") == "alice@tmail.ton")
    }

    @Test
    func `normalizeTmailDomain leaves other domains untouched`() {
        #expect(TmailHelpers.normalizeTmailDomain(" Alice@Tmail.Ton ") == "alice@tmail.ton")
        #expect(TmailHelpers.normalizeTmailDomain("example.ton") == "example.ton")
    }

    @Test
    func `isTmailAlias accepts both tmail_ton and tmail_ae`() {
        #expect(TmailHelpers.isTmailAlias("alice@tmail.ton"))
        #expect(TmailHelpers.isTmailAlias("alice@tmail.ae"))
        #expect(TmailHelpers.isTmailAlias("Alice@TMail.AE"))
    }

    @Test
    func `isTmailAlias rejects unrelated domains`() {
        #expect(!TmailHelpers.isTmailAlias("alice@tmail.com"))
        #expect(!TmailHelpers.isTmailAlias("alice@example.ton"))
    }

    @Test
    func `tmailAliasBase is the same regardless of suffix`() {
        #expect(TmailHelpers.tmailAliasBase("alice@tmail.ton") == "alice")
        #expect(TmailHelpers.tmailAliasBase("alice@tmail.ae") == "alice")
        #expect(TmailHelpers.tmailAliasBase("alice@tmail.com") == nil)
    }
}
