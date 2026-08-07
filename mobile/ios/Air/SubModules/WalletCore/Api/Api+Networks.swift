import Foundation
import WalletContext
import WalletCoreTypes

extension Api {

    public static func getRpcConfig(network: ApiNetwork) async throws -> [ApiNetworkRpcConfigItem] {
        try await bridge.callApi("getRpcConfig", network, decoding: [ApiNetworkRpcConfigItem].self)
    }

    public static func testRpcEndpoint(
        chain: String,
        network: ApiNetwork,
        field: String,
        url: String,
        apiKey: String? = nil
    ) async throws -> ApiRpcTestResult {
        try await bridge.callApi(
            "testRpcEndpoint",
            chain,
            network,
            field,
            url,
            apiKey,
            decoding: ApiRpcTestResult.self
        )
    }

    public static func setRpcOverride(
        chain: String,
        network: ApiNetwork,
        field: String,
        url: String,
        apiKey: String? = nil,
        force: Bool? = nil,
        password: String? = nil
    ) async throws -> ApiRpcTestResult {
        try await bridge.callApi(
            "setRpcOverride",
            chain,
            network,
            field,
            url,
            apiKey,
            force,
            password,
            decoding: ApiRpcTestResult.self
        )
    }

    public static func resetRpcOverride(
        chain: String,
        network: ApiNetwork,
        field: String
    ) async throws -> ApiRpcResetResult {
        try await bridge.callApi(
            "resetRpcOverride",
            chain,
            network,
            field,
            decoding: ApiRpcResetResult.self
        )
    }

    public static func unlockRpcApiKey(
        chain: String,
        network: ApiNetwork,
        password: String,
        field: String = "rpc"
    ) async throws -> ApiRpcUnlockResult {
        try await bridge.callApi(
            "unlockRpcApiKey",
            chain,
            network,
            password,
            field,
            decoding: ApiRpcUnlockResult.self
        )
    }

    public static func setChainVisibility(
        chain: String,
        network: ApiNetwork,
        isHidden: Bool
    ) async throws -> ApiRpcResetResult {
        try await bridge.callApi(
            "setChainVisibility",
            chain,
            network,
            isHidden,
            decoding: ApiRpcResetResult.self
        )
    }

    public static func setAccountVaultProfile(
        accountId: String,
        isVault: Bool
    ) async throws -> ApiRpcResetResult {
        try await bridge.callApi(
            "setAccountVaultProfile",
            accountId,
            isVault,
            decoding: ApiRpcResetResult.self
        )
    }

    public static func syncVaultAccounts(
        accountIds: [String]
    ) async throws -> ApiRpcResetResult {
        try await bridge.callApi(
            "syncVaultAccounts",
            accountIds,
            decoding: ApiRpcResetResult.self
        )
    }
}

// MARK: - Types

public struct ApiNetworkRpcConfigItem: Equatable, Hashable, Codable, Sendable, Identifiable {
    public var chain: String
    public var title: String
    public var fields: [ApiNetworkRpcFieldConfig]
    public var isHidden: Bool?

    public var id: String { chain }
}

public struct ApiNetworkRpcFieldConfig: Equatable, Hashable, Codable, Sendable {
    public var field: String
    public var label: String
    public var url: String
    public var apiKey: String?
    public var isApiKeyLocked: Bool?
    public var hasApiKey: Bool?
    public var isDefault: Bool
    public var defaultUrl: String
}

public struct ApiRpcTestResult: Equatable, Hashable, Codable, Sendable {
    public var status: String
    public var details: String?
    public var saved: Bool?
}

public struct ApiRpcResetResult: Equatable, Hashable, Codable, Sendable {
    public var ok: Bool
}

public struct ApiRpcUnlockResult: Equatable, Hashable, Codable, Sendable {
    public var ok: Bool
    public var apiKey: String?
}
