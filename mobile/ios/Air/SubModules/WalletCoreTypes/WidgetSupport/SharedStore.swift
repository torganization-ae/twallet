//
//  SharedStore.swift
//  WalletCore
//
//  Created by nikstar on 23.09.2025.
//

import Foundation
import WalletContext

private let log = Log("SharedStore")

public actor SharedStore {
    private let cache: SharedCache

    public init(cache: SharedCache = SharedCache()) {
        self.cache = cache
    }

    public func reloadCache() async {
        await cache.reload()
    }

    public func baseCurrency() async -> MBaseCurrency {
        await cache.baseCurrency
    }

    public func tokensDictionary(tryRemote _: Bool) async -> [String: ApiToken] {
        var tokens = await cache.tokens
        // Remote token catalog used to hit api.twallet.ae/assets.
        // Prefer the bundled defaults / shared cache so the widget stays fully local.
        if tokens.isEmpty {
            tokens = ApiToken.defaultTokens
            await cache.setTokens(tokens)
        }
        return tokens.isEmpty ? ApiToken.defaultTokens : tokens
    }

    public func ratesDictionary() async -> [String: MDouble] {
        await cache.rates
    }
}
