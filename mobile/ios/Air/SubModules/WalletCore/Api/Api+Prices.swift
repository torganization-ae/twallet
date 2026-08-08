
import Foundation
import WalletContext
import WalletCoreTypes

extension Api {
    
    public static func fetchPriceHistory(slug: String, period: ApiPriceHistoryPeriod, baseCurrency: MBaseCurrency) async throws -> ApiHistoryList {
        try await bridge.callApi("fetchPriceHistory", slug, period, baseCurrency, decoding: ApiHistoryList.self)
    }

    @concurrent public static func recordPortfolioSnapshot(
        accountId: String,
        totalUsd: Double,
        bySlug: [String: Double] = [:]
    ) async throws {
        try await bridge.callApiVoid("recordPortfolioSnapshot", accountId, totalUsd, bySlug)
    }

    @concurrent public static func ensurePortfolioSnapshotsSeeded(
        accountId: String,
        holdings: [ApiPortfolioBootstrapHolding],
        period: ApiPriceHistoryPeriod = .year
    ) async throws {
        try await bridge.callApiVoid(
            "ensurePortfolioSnapshotsSeeded",
            accountId,
            holdings,
            period.rawValue
        )
    }

    @concurrent public static func fetchPortfolioNetWorthHistory(
        wallets: [String],
        baseCurrency: MBaseCurrency,
        historyRequest: ApiPortfolioHistoryRequest? = nil
    ) async throws -> ApiPortfolioHistoryResponse {
        if let historyRequest {
            try await bridge.callApi(
                "fetchPortfolioNetWorthHistory",
                wallets,
                baseCurrency,
                historyRequest,
                decoding: ApiPortfolioHistoryResponse.self
            )
        } else {
            try await bridge.callApi(
                "fetchPortfolioNetWorthHistory",
                wallets,
                baseCurrency,
                decoding: ApiPortfolioHistoryResponse.self
            )
        }
    }

    @concurrent public static func fetchPortfolioPnlCumulativeHistory(
        wallets: [String],
        baseCurrency: MBaseCurrency,
        historyRequest: ApiPortfolioHistoryRequest? = nil
    ) async throws -> ApiPortfolioHistoryResponse {
        if let historyRequest {
            try await bridge.callApi(
                "fetchPortfolioPnlCumulativeHistory",
                wallets,
                baseCurrency,
                historyRequest,
                decoding: ApiPortfolioHistoryResponse.self
            )
        } else {
            try await bridge.callApi(
                "fetchPortfolioPnlCumulativeHistory",
                wallets,
                baseCurrency,
                decoding: ApiPortfolioHistoryResponse.self
            )
        }
    }

    @concurrent public static func fetchPortfolioPnlHistory(
        wallets: [String],
        baseCurrency: MBaseCurrency,
        historyRequest: ApiPortfolioHistoryRequest? = nil
    ) async throws -> ApiPortfolioHistoryResponse {
        if let historyRequest {
            try await bridge.callApi(
                "fetchPortfolioPnlHistory",
                wallets,
                baseCurrency,
                historyRequest,
                decoding: ApiPortfolioHistoryResponse.self
            )
        } else {
            try await bridge.callApi(
                "fetchPortfolioPnlHistory",
                wallets,
                baseCurrency,
                decoding: ApiPortfolioHistoryResponse.self
            )
        }
    }
}


// MARK: - Types

public typealias ApiHistoryList = [[Double]]

public struct ApiPortfolioBootstrapHolding: Encodable, Equatable, Hashable, Sendable {
    public let slug: String
    public let amount: Double
    public let priceUsd: Double

    public init(slug: String, amount: Double, priceUsd: Double) {
        self.slug = slug
        self.amount = amount
        self.priceUsd = priceUsd
    }
}

public struct ApiPortfolioHistoryRequest: Encodable, Equatable, Hashable, Sendable {
    public let from: Double
    public let to: Double
    public let density: String
    public let accountId: String?
    public let currencyRate: Double?

    public init(
        from: Date,
        to: Date,
        density: String,
        accountId: String? = nil,
        currencyRate: Double? = nil
    ) {
        self.from = from.timeIntervalSince1970
        self.to = to.timeIntervalSince1970
        self.density = density
        self.accountId = accountId
        self.currencyRate = currencyRate
    }
}
