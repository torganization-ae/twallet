import Foundation

public struct AppTabId: Hashable, Sendable, Codable {
    public let rawValue: String

    public init(_ rawValue: String) {
        self.rawValue = rawValue
    }

    public static let wallet = AppTabId("wallet")
    public static let explore = AppTabId("explore")
    public static let settings = AppTabId("settings")
    public static let portfolio = AppTabId("portfolio")
    public static let tmail = AppTabId("tmail")

    public var isRequired: Bool {
        self == .wallet || self == .settings
    }

    /// Action-only tabs open a sheet/chooser and are never selected as content.
    public var isActionOnly: Bool {
        self == .tmail
    }
}
