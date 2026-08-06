import Foundation
import WalletCoreTypes

// Generated based on TypeScript definition. Do not edit manually.
public struct ApiNftCollection: Equatable, Hashable, Codable, Sendable {
    public var chain: ApiChain
    public var address: String

    public init(chain: ApiChain, address: String) {
        self.chain = chain
        self.address = address
    }
}
