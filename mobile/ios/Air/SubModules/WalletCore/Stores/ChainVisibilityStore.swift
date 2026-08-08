import Foundation
import WalletContext
import WalletCoreTypes

/// Tracks which networks are hidden in Settings → Networks.
/// Used to keep activity history (and other UI) scoped to enabled chains only.
public final class ChainVisibilityStore: @unchecked Sendable {
    public static let shared = ChainVisibilityStore()

    private let queue = DispatchQueue(label: "org.twallet.app.chain_visibility_store", attributes: .concurrent)
    private var hiddenByNetwork: [ApiNetwork: Set<ApiChain>] = [:]

    private init() {}

    public func update(hiddenChainsByNetwork: [String: [String]]) {
        var parsed: [ApiNetwork: Set<ApiChain>] = [:]
        for (networkRaw, chains) in hiddenChainsByNetwork {
            guard let network = ApiNetwork(rawValue: networkRaw) else { continue }
            parsed[network] = Set(chains.compactMap { ApiChain(rawValue: $0) })
        }
        queue.async(flags: .barrier) {
            self.hiddenByNetwork = parsed
        }
    }

    public func isHidden(_ chain: ApiChain, network: ApiNetwork) -> Bool {
        queue.sync {
            hiddenByNetwork[network]?.contains(chain) ?? false
        }
    }

    public func isActivityVisible(_ activity: ApiActivity, network: ApiNetwork) -> Bool {
        activityChains(activity).allSatisfy { !isHidden($0, network: network) }
    }

    private func activityChains(_ activity: ApiActivity) -> [ApiChain] {
        switch activity {
        case .transaction(let transaction):
            if let chain = getChainBySlug(transaction.slug) {
                return [chain]
            }
            return []
        case .swap(let swap):
            var chains: [ApiChain] = []
            if let from = getChainBySlug(swap.from) {
                chains.append(from)
            }
            if let to = getChainBySlug(swap.to), to != chains.first {
                chains.append(to)
            }
            return chains
        }
    }
}
