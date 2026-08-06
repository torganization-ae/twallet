import Foundation
import GRDB
import WalletContext

public struct MAccountSettings: Equatable, Hashable, Codable, Sendable, FetchableRecord, PersistableRecord {
    public let accountId: String
    public var accentColorIndex: Int?
    public var isAllowSuspiciousActions: Bool?
    public var portfolioTimeRange: String?

    public init(
        accountId: String,
        accentColorIndex: Int?,
        isAllowSuspiciousActions: Bool?,
        portfolioTimeRange: String?
    ) {
        self.accountId = accountId
        self.accentColorIndex = accentColorIndex
        self.isAllowSuspiciousActions = isAllowSuspiciousActions
        self.portfolioTimeRange = portfolioTimeRange
    }

    public init(accountId: String, settingsDict: [String: Any]) {
        self.init(
            accountId: accountId,
            accentColorIndex: settingsDict["accentColorIndex"] as? Int,
            isAllowSuspiciousActions: settingsDict["isAllowSuspiciousActions"] as? Bool,
            portfolioTimeRange: nil
        )
    }

    public static let databaseTableName: String = "account_settings"
}

extension MAccountSettings {
    public var hasData: Bool {
        accentColorIndex != nil
            || isAllowSuspiciousActions != nil
            || portfolioTimeRange != nil
    }
}
