//
//  TmailHelpers.swift
//  MyTonWalletAir
//
//  Tmail alias detection helpers. Kept separate from DNSHelpers so the two detectors don't mix.
//

import Foundation

private let TMAIL_DOMAIN_SUFFIX = "@tmail.ton"
private let TMAIL_SHARE_PATH = "/share/"
private let TMAIL_ALIAS_REGEX = try! NSRegularExpression(
    pattern: "^[a-z0-9]([-_+a-z0-9]{0,62}[a-z0-9])?$",
    options: .caseInsensitive
)

public class TmailHelpers {
    private init() {}

    public static func isTmailAlias(_ value: String) -> Bool {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard trimmed.hasSuffix(TMAIL_DOMAIN_SUFFIX) else { return false }

        let base = String(trimmed.dropLast(TMAIL_DOMAIN_SUFFIX.count))
        guard !base.isEmpty else { return false }

        let range = NSRange(location: 0, length: base.utf16.count)
        return TMAIL_ALIAS_REGEX.firstMatch(in: base, options: [], range: range) != nil
    }

    public static func tmailAliasBase(_ value: String) -> String? {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard trimmed.hasSuffix(TMAIL_DOMAIN_SUFFIX) else { return nil }

        let base = String(trimmed.dropLast(TMAIL_DOMAIN_SUFFIX.count))
        guard !base.isEmpty else { return nil }

        let range = NSRange(location: 0, length: base.utf16.count)
        return TMAIL_ALIAS_REGEX.firstMatch(in: base, options: [], range: range) != nil ? base : nil
    }

    /// Mailbox carried by a TMail share QR: `https://<any-host>/share/<url-encoded mailbox>`.
    /// The host is not checked — dev/staging/prod hosts all differ.
    public static func parseShareQr(_ raw: String) -> String? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let markerRange = trimmed.range(of: TMAIL_SHARE_PATH) else { return nil }

        // `#` and `@` of a web3 mailbox are percent-encoded in the QR, so cut the tail off before decoding.
        let encoded = trimmed[markerRange.upperBound...]
            .prefix { $0 != "?" && $0 != "#" && $0 != "/" }
        guard let mailbox = String(encoded).removingPercentEncoding?
            .trimmingCharacters(in: .whitespacesAndNewlines),
              mailbox.contains("@") else { return nil }

        return mailbox
    }

    /// Bare local-part alias (no `.` / `@`) that can be resolved as `@tmail.ton` then `.ton` DNS.
    public static func isBareTonAlias(_ value: String) -> Bool {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !trimmed.isEmpty, !trimmed.contains("."), !trimmed.contains("@") else { return false }

        let range = NSRange(location: 0, length: trimmed.utf16.count)
        return TMAIL_ALIAS_REGEX.firstMatch(in: trimmed, options: [], range: range) != nil
    }
}
