//
//  Api+Other.swift
//  WalletCore
//
//  Created by Sina on 11/6/24.
//

import Foundation
import WalletContext
import WalletCoreTypes

extension Api {

    public static func setIsAppFocused(_ isFocused: Bool) async throws {
        try await bridge.callApiVoid("setIsAppFocused", isFocused)
        if isFocused{
            WalletCoreData.notify(event: .applicationWillEnterForeground)
        } else {
            WalletCoreData.notify(event: .applicationDidEnterBackground)
        }
    }

    public static func getLogs() async throws -> Any? {
        try await bridge.callApiRaw("getLogs")
    }

    public static func ping() async throws -> Bool {
        try await bridge.callApi("ping", decoding: Bool.self)
    }

    public static func getEnvironmentVariables() async throws -> ApiEnvironmentVariables {
        try await bridge.callApi("getEnvironmentVariables", decoding: ApiEnvironmentVariables.self)
    }

    public static func waitForLedgerApp(chain: ApiChain, options: WaitForLedgerAppOptions?) async throws -> Bool {
            try await bridge.callApi("waitForLedgerApp", chain, options, decoding: Bool.self)
    }
}

public struct WaitForLedgerAppOptions: Encodable, Sendable {
    public var timeout: Int?
    public var attemptPause: Int?
}

public struct ApiEnvironmentVariables: Codable, Sendable {
    public var appEnv: String
    public var appVersion: String
    public var isAndroidDirect: Bool
    public var apiHostMark: String?
}
