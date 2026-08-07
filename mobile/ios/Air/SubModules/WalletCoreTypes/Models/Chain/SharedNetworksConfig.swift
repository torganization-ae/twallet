import Foundation

/**
 Loads `networks.json` shipped in WalletResources — the same file as `shared/networks.json`
 and the Android asset. Dynamic RPC overrides / visibility still come from the JS bridge;
 this loader covers static metadata (defaultEnabled, apiKeyEligible, endpoints, chainIds).
 */
public enum SharedNetworksConfig {
    public struct Endpoints: Decodable, Sendable {
        public var rpc: String
        public var api: String
        public var failoverRpc: [String]?
    }

    public struct ApiKeyEligible: Decodable, Sendable {
        public var rpc: Bool
        public var api: Bool
    }

    public struct Chain: Decodable, Sendable {
        public var title: String
        public var displayColor: String
        public var endpoints: [String: Endpoints]
        public var defaultEnabled: [String: Bool]
        public var apiKeyEligible: ApiKeyEligible
        public var evmChainId: [String: Int]?
    }

    public struct File: Decodable, Sendable {
        public var chainOrder: [String]
        public var displayOrder: [String]
        public var chains: [String: Chain]
    }

    private static let cached: File = {
        let candidates: [URL?] = [
            Bundle.main.url(forResource: "networks", withExtension: "json"),
            Bundle(for: BundleToken.self).url(forResource: "networks", withExtension: "json"),
        ]
        for url in candidates.compactMap({ $0 }) {
            if let data = try? Data(contentsOf: url),
               let decoded = try? JSONDecoder().decode(File.self, from: data) {
                return decoded
            }
        }
        return File(chainOrder: [], displayOrder: [], chains: [:])
    }()

    public static var config: File { cached }

    public static func chain(_ id: String) -> Chain? {
        cached.chains[id]
    }

    public static func isApiKeyEligible(chain: String, field: String) -> Bool {
        guard let cfg = cached.chains[chain] else { return false }
        return field == "api" ? cfg.apiKeyEligible.api : cfg.apiKeyEligible.rpc
    }

    public static func isDefaultEnabled(chain: String, network: String) -> Bool {
        guard let cfg = cached.chains[chain] else { return false }
        let enabled = cfg.defaultEnabled[network] ?? false
        let rpc = cfg.endpoints[network]?.rpc ?? ""
        return enabled && !rpc.isEmpty
    }

    private final class BundleToken {}
}
