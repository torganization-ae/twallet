import Foundation

public enum DisplayAssetTab: Hashable, Sendable {
    case tokens
    case activity
    case nfts
    case nftCollectionFilter(NftCollectionFilter)

    public var debugDescription: String {
        switch self {
        case .tokens:
            "tokens"
        case .activity:
            "activity"
        case .nfts:
            "nfts"
        case .nftCollectionFilter(let filter):
            "nftCollectionFilter(\(filter.displayTitle))"
        }
    }
}
