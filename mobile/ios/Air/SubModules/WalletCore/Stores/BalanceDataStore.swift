import Dependencies
import Foundation
import Perception
import WalletContext
import WalletCoreTypes

private let log = Log("BalanceDataStore")

public var BalanceDataStore: _BalanceDataStore { _BalanceDataStore.shared }

@MainActor
@Perceptible
public final class AccountBalanceData: Sendable {
    public let accountId: String
    public private(set) var walletTokensData: MAccountWalletTokensData?
    public private(set) var balanceTotals: MAccountBalanceTotals?

    nonisolated init(accountId: String) {
        self.accountId = accountId
    }

    fileprivate var isMissing: Bool {
        walletTokensData == nil || balanceTotals == nil
    }

    @discardableResult
    fileprivate func replace(
        walletTokensData nextWalletTokensData: MAccountWalletTokensData?,
        balanceTotals nextBalanceTotals: MAccountBalanceTotals?
    ) -> Bool {
        let walletTokensChanged = walletTokensData != nextWalletTokensData
        let balanceTotalsChanged = balanceTotals != nextBalanceTotals

        if walletTokensChanged {
            walletTokensData = nextWalletTokensData
        }
        if balanceTotalsChanged {
            balanceTotals = nextBalanceTotals
        }

        return walletTokensChanged || balanceTotalsChanged
    }
}

public actor _BalanceDataStore: WalletCoreData.EventsObserver {
    public static let shared = _BalanceDataStore()

    private struct ComputedAccountData: Sendable {
        let walletTokensData: MAccountWalletTokensData
        let balanceTotals: MAccountBalanceTotals
    }

    // dependencies
    private let balancesStore: _BalancesStore
    private let assetsAndActivityDataStore: _AssetsAndActivityDataStore
    private let accountStore: _AccountStore
    private let tokenStore: _TokenStore

    @MainActor private var byAccountId: MainActorByAccountIdStore<AccountBalanceData> = .init(initialValue: AccountBalanceData.init(accountId:))
    private var updateDataTask: Task<Void, Never>?
    private var lastUpdateData: Date = .distantPast
    private var lastPortfolioSnapshotByAccount: [String: (totalUsd: Double, at: Date)] = [:]
    private let portfolioSnapshotMinInterval: TimeInterval = 60
    private let portfolioSnapshotEpsilonUsd: Double = 0.01

    private init() {
        @Dependency(\.balancesStore) var balancesStore
        @Dependency(\.assetsAndActivityDataStore) var assetsAndActivityDataStore
        @Dependency(\.accountStore) var accountStore
        @Dependency(\.tokenStore) var tokenStore

        self.balancesStore = balancesStore
        self.assetsAndActivityDataStore = assetsAndActivityDataStore
        self.accountStore = accountStore
        self.tokenStore = tokenStore
    }

    public func use() {
        WalletCoreData.add(eventObserver: self)
    }

    public func clean() async {
        updateDataTask?.cancel()
        updateDataTask = nil
        lastUpdateData = .distantPast
        lastPortfolioSnapshotByAccount.removeAll()
        await MainActor.run {
            byAccountId.removeAll()
        }
    }

    @MainActor public func `for`(accountId: String) -> AccountBalanceData {
        let context = byAccountId.for(accountId: accountId)
        if context.isMissing {
            Task {
                await recomputeAccountIfMissing(accountId: accountId)
            }
        }
        return context
    }

    @MainActor public func walletTokensData(accountId: String) -> MAccountWalletTokensData? {
        self.for(accountId: accountId).walletTokensData
    }

    @MainActor public func balanceTotals(accountId: String) -> MAccountBalanceTotals? {
        self.for(accountId: accountId).balanceTotals
    }

    @MainActor public func totalBalance(ofWalletsWithType type: AccountType?) -> BaseCurrencyAmount {
        let filteredAccounts = accountStore.accountsById.values.filter { account in
            guard account.network == .mainnet else { return false }
            return if let type {
                account.type == type
            } else {
                true
            }
        }

        var baseCurrency = tokenStore.baseCurrency
        let amount = filteredAccounts.reduce(BigInt.zero) { partialResult, account in
            let context = byAccountId.for(accountId: account.id)
            if context.isMissing {
                Task {
                    await recomputeAccountIfMissing(accountId: account.id)
                }
            }
            guard let totals = context.balanceTotals else {
                return partialResult
            }
            baseCurrency = totals.totalBalance.baseCurrency
            return partialResult + totals.totalBalance.amount
        }
        return BaseCurrencyAmount(amount, baseCurrency)
    }

    @MainActor public func walletCore(event: WalletCoreData.Event) {
        Task {
            await handleEvent(event)
        }
    }

    private func handleEvent(_ event: WalletCoreData.Event) async {
        switch event {
        case .rawBalancesChanged(let accountId):
            await recomputeAccount(accountId: accountId)
        case .baseCurrencyChanged, .tokensChanged, .hideNoCostTokensChanged, .assetsAndActivityDataUpdated, .chainVisibilityChanged:
            scheduleRecomputeAllKnownAccounts()
        case .accountDeleted(let accountId):
            await removeAccountData(accountId: accountId)
        case .accountsReset:
            await clean()
        default:
            break
        }
    }

    private func scheduleRecomputeAllKnownAccounts() {
        if Date().timeIntervalSince(lastUpdateData) > 0.1 {
            updateDataTask?.cancel()
            updateDataTask = Task {
                await recomputeAllKnownAccounts()
            }
        } else {
            updateDataTask?.cancel()
            updateDataTask = Task {
                do {
                    try await Task.sleep(for: .seconds(0.1))
                    await recomputeAllKnownAccounts()
                } catch {}
            }
        }
    }

    private func recomputeAllKnownAccounts() async {
        lastUpdateData = .now
        let accountIds = await MainActor.run {
            byAccountId.accountIds()
        }
        for accountId in accountIds {
            await recomputeAccount(accountId: accountId)
        }
    }

    private func recomputeAccountIfMissing(accountId: String) async {
        let isMissing = await MainActor.run {
            byAccountId.for(accountId: accountId).isMissing
        }
        guard isMissing else { return }
        await recomputeAccount(accountId: accountId)
    }

    private func recomputeAccount(accountId: String) async {
        let nextData = computeAccountData(accountId: accountId)
        let changed = await applyAccountData(accountId: accountId, nextData: nextData)
        if changed {
            WalletCoreData.notify(event: .balanceChanged(accountId: accountId))
            await recordPortfolioSnapshot(accountId: accountId, from: nextData, force: false)
        }
    }

    public func recordPortfolioSnapshot(accountId: String) async {
        let nextData = computeAccountData(accountId: accountId)
        await recordPortfolioSnapshot(accountId: accountId, from: nextData, force: true)
    }

    public func bootstrapHoldings(accountId: String) -> [ApiPortfolioBootstrapHolding] {
        let data = computeAccountData(accountId: accountId)
        var amountBySlug: [String: Double] = [:]
        var priceBySlug: [String: Double] = [:]

        for balance in data.walletTokensData.orderedTokenBalances {
            guard let token = balance.token ?? TokenStore.getToken(slug: balance.tokenSlug),
                  let priceUsd = token.priceUsd,
                  priceUsd > 0
            else {
                continue
            }
            let amount = balance.balance.doubleAbsRepresentation(decimals: token.decimals)
            guard amount > 0 else { continue }
            amountBySlug[balance.tokenSlug, default: 0] += amount
            priceBySlug[balance.tokenSlug] = priceUsd
        }

        return amountBySlug.compactMap { slug, amount in
            guard let priceUsd = priceBySlug[slug] else { return nil }
            return ApiPortfolioBootstrapHolding(slug: slug, amount: amount, priceUsd: priceUsd)
        }
    }

    private func recordPortfolioSnapshot(
        accountId: String,
        from data: ComputedAccountData,
        force: Bool
    ) async {
        let totalUsd = data.balanceTotals.totalBalanceUsd
        if !force, let previous = lastPortfolioSnapshotByAccount[accountId] {
            let withinInterval = Date().timeIntervalSince(previous.at) < portfolioSnapshotMinInterval
            let withinEpsilon = abs(previous.totalUsd - totalUsd) < portfolioSnapshotEpsilonUsd
            if withinInterval && withinEpsilon {
                return
            }
        }

        var bySlug: [String: Double] = [:]
        for balance in data.walletTokensData.orderedTokenBalances {
            let usd = balance.toUsd ?? 0
            guard usd > 0 else { continue }
            bySlug[balance.tokenSlug, default: 0] += usd
        }
        do {
            try await Api.recordPortfolioSnapshot(
                accountId: accountId,
                totalUsd: totalUsd,
                bySlug: bySlug
            )
            lastPortfolioSnapshotByAccount[accountId] = (totalUsd, Date())
        } catch {
            log.error("recordPortfolioSnapshot failed \(accountId, .public): \(error, .public)")
        }
    }

    @MainActor private func applyAccountData(accountId: String, nextData: ComputedAccountData) -> Bool {
        byAccountId
            .for(accountId: accountId)
            .replace(walletTokensData: nextData.walletTokensData, balanceTotals: nextData.balanceTotals)
    }

    @MainActor private func removeAccountData(accountId: String) {
        if let context = byAccountId.existing(accountId: accountId) {
            context.replace(walletTokensData: nil, balanceTotals: nil)
        }
        byAccountId.remove(accountId: accountId)
        Task {
            await clearPortfolioSnapshotThrottle(accountId: accountId)
        }
    }

    private func clearPortfolioSnapshotThrottle(accountId: String) {
        lastPortfolioSnapshotByAccount.removeValue(forKey: accountId)
    }

    private nonisolated func computeAccountData(accountId: String) -> ComputedAccountData {
        let balances = balancesStore.getAccountBalances(accountId: accountId)
        let account = accountStore.get(accountId: accountId)
        let network = account.network
        var walletTokens: [MTokenBalance] = balances.compactMap { slug, amount in
            if let chain = getChainBySlug(slug) ?? tokenStore.tokens[slug]?.chain,
               ChainVisibilityStore.shared.isHidden(chain, network: network) {
                return nil
            }
            return MTokenBalance(tokenSlug: slug, balance: amount)
        }

        var allTokensFound = true
        var totalBalance: Double = 0
        var totalBalanceYesterday: Double = 0
        var totalBalanceUsd: Double = 0
        var totalBalanceUsdByChain: [ApiChain: Double] = [:]

        for token in walletTokens {
            if let value = token.toBaseCurrency, let yesterday = token.toBaseCurrency24h {
                totalBalance += value
                totalBalanceYesterday += yesterday
                let amountInUsd = token.toUsd ?? 0
                totalBalanceUsd += amountInUsd
                if let chain = token.token?.chain {
                    totalBalanceUsdByChain[chain, default: 0] += amountInUsd
                }
            } else if tokenStore.tokens[token.tokenSlug] == nil {
                allTokensFound = false
            }
        }
        if !allTokensFound {
            log.error("not all tokens found \(accountId, .public)")
        }

        if AppStorageHelper.hideNoCostTokens {
            walletTokens = walletTokens.filter { balance in
                // Keep native gas tokens visible at any non-zero balance.
                if balance.balance > 0, balance.token?.isNative == true {
                    return true
                }
                if (balance.toUsd ?? 0) <= 0.01, balance.token?.isPricelessToken != true {
                    return false
                }
                return true
            }
        }

        let prefs = assetsAndActivityDataStore.data(accountId: accountId) ?? MAssetsAndActivityData.empty

        for slug in prefs.importedSlugs {
            let chain = tokenStore.tokens[slug]?.chain
            if !walletTokens.contains(where: { $0.tokenSlug == slug }),
               account.supports(chain: chain),
               !(chain.map { ChainVisibilityStore.shared.isHidden($0, network: network) } ?? false) {
                walletTokens.append(MTokenBalance(tokenSlug: slug, balance: 0))
            }
        }

        if totalBalance == 0 || totalBalanceUsd < TINY_TRANSFER_MAX_COST {
            let slugsInWallet = Set(walletTokens.map { $0.tokenSlug })
            let defaultSlugs = ApiToken.defaultSlugs(forNetwork: account.network, account: account)
            for slug in defaultSlugs.subtracting(slugsInWallet) {
                let chain = tokenStore.tokens[slug]?.chain
                if account.supports(chain: chain),
                   !(chain.map { ChainVisibilityStore.shared.isHidden($0, network: network) } ?? false) {
                    walletTokens.append(MTokenBalance(tokenSlug: slug, balance: 0))
                }
            }
        }

        walletTokens.removeAll(where: { prefs.isTokenHidden(slug: $0.tokenSlug) })

        let baseCurrency = tokenStore.baseCurrency
        let totalBalanceAmount = BaseCurrencyAmount.fromDouble(totalBalance, baseCurrency)
        let totalBalanceYesterdayAmount = BaseCurrencyAmount.fromDouble(totalBalanceYesterday, baseCurrency)
        let totalBalanceChange: Double? = if totalBalanceYesterday > 0 {
            (totalBalance - totalBalanceYesterday) / totalBalanceYesterday
        } else {
            nil
        }
        let orderedTokenBalances = MTokenBalance.sortedForBalanceData(
            tokenBalances: walletTokens,
            balances: balances,
            defaultTokenSlugs: ApiToken.defaultSlugs(forNetwork: account.network, account: account),
            importedTokenSlugs: prefs.importedSlugs
        )
        let walletTokensData = MAccountWalletTokensData(orderedTokenBalances: orderedTokenBalances)
        let balanceTotals = MAccountBalanceTotals(
            totalBalance: totalBalanceAmount,
            totalBalanceYesterday: totalBalanceYesterdayAmount,
            totalBalanceUsd: totalBalanceUsd,
            totalBalanceChange: totalBalanceChange,
            totalBalanceUsdByChain: totalBalanceUsdByChain
        )
        return ComputedAccountData(walletTokensData: walletTokensData, balanceTotals: balanceTotals)
    }
}

extension _BalanceDataStore: DependencyKey {
    public static let liveValue: _BalanceDataStore = .shared
}

public extension DependencyValues {
    var balanceDataStore: _BalanceDataStore {
        get { self[_BalanceDataStore.self] }
        set { self[_BalanceDataStore.self] = newValue }
    }
}
