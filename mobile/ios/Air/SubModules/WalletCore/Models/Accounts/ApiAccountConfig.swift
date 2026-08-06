import Foundation

public struct ApiAccountConfig: Equatable, Hashable, Codable, Sendable {
    public var isMfaEnabled: Bool?

    private enum CodingKeys: String, CodingKey {
        case isMfaEnabled
    }

    public init(isMfaEnabled: Bool? = nil) {
        self.isMfaEnabled = isMfaEnabled
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.isMfaEnabled = try? container.decodeIfPresent(Bool.self, forKey: .isMfaEnabled)
    }
}

public enum DebugMfaEnabledOverride {
    public static let userDefaultsKey = "debug_forceMfaEnabled"

    public static var isEnabled: Bool {
        UserDefaults.standard.bool(forKey: userDefaultsKey)
    }
}
