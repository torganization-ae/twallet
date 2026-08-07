import WidgetKit
import UIKit
import WalletCoreTypes

struct TokenWithChartWidgetTimelineProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> TokenWithChartWidgetTimelineEntry {
        TokenWithChartWidgetTimelineEntry.placeholder
    }

    func snapshot(for configuration: TokenWithChartWidgetConfiguration, in context: Context) async -> TokenWithChartWidgetTimelineEntry {
        await loadEntry(for: configuration, date: .now)
    }

    func timeline(for configuration: TokenWithChartWidgetConfiguration, in context: Context) async -> Timeline<TokenWithChartWidgetTimelineEntry> {
        let entry = await loadEntry(for: configuration, date: .now)
        return Timeline(entries: [entry], policy: .after(Date(timeIntervalSinceNow: 900)))
    }

    private func loadEntry(for configuration: TokenWithChartWidgetConfiguration, date: Date) async -> TokenWithChartWidgetTimelineEntry {
        let store = SharedStore()
        _ = await store.reloadCache()

        async let displayCurrency = store.displayCurrency()
        async let tokens = store.tokensDictionary(tryRemote: true)
        async let rates = store.ratesDictionary()

        let selectedSlug = configuration.token.tokenSlug
        let loadedDisplayCurrency = await displayCurrency
        let loadedTokens = await tokens
        let loadedRates = await rates
        let token = loadedTokens[selectedSlug] ?? configuration.token.apiTokenFallback

        var image: UIImage?
        do {
            if let s = token.image, let url = URL(string: s) {
                let (data, _) = try await URLSession.shared.data(from: url)
                image = await Task { UIImage(data: data) }.value
            }
        } catch {
            print("loadEntry image: \(error)")
        }
        
        var chartData: [(Double, Double)] = []
        var chartCurrency = chartBaseCurrency(for: loadedDisplayCurrency)
        do {
            let tokenAddress = token.tokenAddress?.trimmingCharacters(in: .whitespacesAndNewlines)
            let assetIdentifier = tokenAddress.flatMap { $0.isEmpty ? nil : $0 } ?? token.symbol
            let assetId = "\(token.chain.rawValue):\(assetIdentifier)"
            let loadedChart = try await loadChartData(
                assetId: assetId,
                baseCurrency: chartCurrency,
                period: configuration.period
            )
            chartData = loadedChart.data
            chartCurrency = loadedChart.currency
        } catch {
            print("loadEntry chartData: \(error)")
        }

        let currencyRate = BaseCurrencyAmount.fromDouble(
            (token.priceUsd ?? 0) * (loadedRates[chartCurrency.rawValue]?.value ?? chartCurrency.fallbackExchangeRate),
            chartCurrency
        )

        return TokenWithChartWidgetTimelineEntry(
            date: date,
            token: token,
            image: image,
            currencyRate: currencyRate,
            period: configuration.period,
            chartData: chartData,
            chartStyle: .vivid // configuration.style,
        )
    }

    private func loadChartData(assetId: String, baseCurrency: MBaseCurrency, period: PricePeriod) async throws -> (data: [(Double, Double)], currency: MBaseCurrency) {
        do {
            return (try await fetchChartData(assetId: assetId, baseCurrency: baseCurrency, period: period), baseCurrency)
        } catch {
            guard baseCurrency != .USD else { throw error }
            return (try await fetchChartData(assetId: assetId, baseCurrency: .USD, period: period), .USD)
        }
    }

    private func fetchChartData(assetId: String, baseCurrency: MBaseCurrency, period: PricePeriod) async throws -> [(Double, Double)] {
        // Public tonapi rates chart (replaces former api.mytonwallet.org proxy)
        var components = URLComponents(string: "https://tonapi.io/v2/rates/chart")!
        components.queryItems = [
            URLQueryItem(name: "token", value: assetId),
            URLQueryItem(name: "currency", value: baseCurrency.rawValue.lowercased()),
            URLQueryItem(name: "points_count", value: Self.pointsCount(for: period)),
        ]
        let (data, _) = try await URLSession.shared.data(from: components.url!)
        if let decoded = try? JSONDecoder().decode(ApiHistoryList.self, from: data) {
            return decoded.map { ($0[0], $0[1]) }
        }
        // tonapi returns { points: [[ts, price], ...] }
        struct TonapiChart: Decodable {
            let points: [[Double]]?
        }
        let tonapi = try JSONDecoder().decode(TonapiChart.self, from: data)
        guard let points = tonapi.points, !points.isEmpty else {
            throw URLError(.cannotParseResponse)
        }
        return points.compactMap { point in
            guard point.count >= 2 else { return nil }
            return (point[0], point[1])
        }
    }

    private static func pointsCount(for period: PricePeriod) -> String {
        switch period {
        case .day: return "24"
        case .week: return "48"
        case .month: return "60"
        default: return "100"
        }
    }

    private func chartBaseCurrency(for baseCurrency: MBaseCurrency) -> MBaseCurrency {
        switch baseCurrency {
        case .TON:
            return .USD
        case .USD, .EUR, .RUB, .CNY:
            return baseCurrency
        case .BTC:
            return baseCurrency
        }
    }
}
