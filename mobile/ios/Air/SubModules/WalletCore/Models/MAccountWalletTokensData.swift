import Foundation
import OrderedCollections

public struct MAccountWalletTokensData: Equatable, Hashable, Sendable {
    public let orderedTokenBalancesDict: OrderedDictionary<TokenID, MTokenBalance>

    public var orderedTokenBalances: [MTokenBalance] { Array(orderedTokenBalancesDict.values) }
    public var walletTokens: [MTokenBalance] { orderedTokenBalances }

    init(orderedTokenBalances: [MTokenBalance]) {
        self.orderedTokenBalancesDict = OrderedDictionary(
            uniqueKeysWithValues: orderedTokenBalances.map { ($0.tokenID, $0) }
        )
    }
}
