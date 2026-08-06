
import Foundation
import WalletContext
import WalletCoreTypes

// Generated based on TypeScript definition. Do not edit manually.
public struct ApiNft: Equatable, Hashable, Codable, Sendable {
    public var chain: ApiChain = FALLBACK_CHAIN
    public var index: Int?
    public var ownerAddress: String?
    public var name: String?
    public var address: String
    public var thumbnail: String?
    public var image: String?
    public var description: String?
    public var collectionName: String?
    public var collectionAddress: String?
    public var isOnSale: Bool
    public var isHidden: Bool?
    public var isOnFragment: Bool?
    public var isTelegramGift: Bool?
    public var isScam: Bool?
    public var metadata: ApiNftMetadata?
    public var interface: ApiNftInterface = .default
    public var compression: ApiNftCompression?
    
    public static func == (lhs: ApiNft, rhs: ApiNft) -> Bool {
        lhs.chain == rhs.chain && lhs.address == rhs.address
    }
    
    public func hash(into hasher: inout Hasher) {
        hasher.combine(chain)
        hasher.combine(address)
    }
}

extension ApiNft {
    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.chain = (try? container.decodeIfPresent(ApiChain.self, forKey: .chain)) ?? FALLBACK_CHAIN
        self.index = try? container.decode(Int.self, forKey: .index)
        self.ownerAddress = try? container.decodeIfPresent(String.self, forKey: .ownerAddress)
        self.name = try? container.decodeIfPresent(String.self, forKey: .name)
        self.address = try container.decode(String.self, forKey: .address)
        self.thumbnail = try? container.decode(String.self, forKey: .thumbnail)
        self.image = try? container.decode(String.self, forKey: .image)
        self.description = try? container.decodeIfPresent(String.self, forKey: .description)
        self.collectionName = try? container.decodeIfPresent(String.self, forKey: .collectionName)
        self.collectionAddress = try? container.decodeIfPresent(String.self, forKey: .collectionAddress)
        self.isOnSale = (try? container.decodeIfPresent(Bool.self, forKey: .isOnSale)) ?? false
        self.isHidden = try? container.decodeIfPresent(Bool.self, forKey: .isHidden)
        self.isOnFragment = try? container.decodeIfPresent(Bool.self, forKey: .isOnFragment)
        self.isTelegramGift = try? container.decodeIfPresent(Bool.self, forKey: .isTelegramGift)
        self.isScam = try? container.decodeIfPresent(Bool.self, forKey: .isScam)
        self.metadata = try? container.decodeIfPresent(ApiNftMetadata.self, forKey: .metadata)
        self.interface = (try? container.decodeIfPresent(ApiNftInterface.self, forKey: .interface)) ?? .default
        self.compression = try? container.decodeIfPresent(ApiNftCompression.self, forKey: .compression)
    }
}

extension ApiNft: Identifiable {
    public var id: String { Self.id(chain: chain, address: address) }

    public static func id(chain: ApiChain, address: String) -> String {
        chain == .ton ? address : "\(chain.rawValue):\(address)"
    }
}

extension ApiNft {
    public static let ERROR = ApiNft(index: 0, address: "error_address", thumbnail: "", image: "", isOnSale: false)
}


public struct ApiNftMetadata: Equatable, Hashable, Codable, Sendable {
    public var attributes: [ApiNftMetadataAttribute]?
    public var lottie: String?
    public var imageUrl: String?
    public var fragmentUrl: String?
}

// Generated based on TypeScript definition. Do not edit manually.
public enum ApiNftInterface: String, Equatable, Hashable, Codable, Sendable, CaseIterable {
    case `default` = "default"
    case erc721 = "ERC721"
    case erc1155 = "ERC1155"
    case compressed = "compressed"
    case mplCore = "mplCore"
}

public struct ApiNftCompression: Equatable, Hashable, Codable, Sendable {
    public var tree: String
    public var dataHash: String
    public var creatorHash: String
    public var leafId: Int
}

public struct ApiNftMetadataAttribute: Equatable, Hashable, Codable, Sendable {
    public var trait_type: String
    public var value: String
}

// MARK: - Extensions

public extension ApiNft {
    var isStandalone: Bool { collectionName?.nilIfEmpty == nil }
    var displayName: String { name ?? "NFT" }
    static let TON_DNS_COLLECTION_ADDRESS = "EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz"
    static let TELEGRAM_USERNAMES_COLLECTION_ADDRESS = "EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi"
    static let VIP_DNS_COLLECTION_ADDRESS = "EQBWG4EBbPDv4Xj7xlPwzxd7hSyHMzwwLB5O6rY-0BBeaixS"
    static let GRAM_DNS_COLLECTION_ADDRESS = "EQAic3zPce496ukFDhbco28FVsKKl2WUX_iJwaL87CBxSiLQ"
    static let LINKABLE_DNS_COLLECTION_ADDRESSES: Set<String> = [
        TON_DNS_COLLECTION_ADDRESS,
        TELEGRAM_USERNAMES_COLLECTION_ADDRESS,
        VIP_DNS_COLLECTION_ADDRESS,
        GRAM_DNS_COLLECTION_ADDRESS,
    ]
    var isTonDns: Bool { collectionAddress == ApiNft.TON_DNS_COLLECTION_ADDRESS }
    var isLinkableDns: Bool { collectionAddress.map(Self.LINKABLE_DNS_COLLECTION_ADDRESSES.contains) ?? false }
    var isRenewableDns: Bool { isTonDns }

    var fragmentUrl: URL? {
        guard isOnFragment == true else { return nil }
        if let fragmentUrl = metadata?.fragmentUrl?.nilIfEmpty, let url = URL(string: fragmentUrl) {
            return url
        }

        let nftName = displayName
        if collectionName?.localizedCaseInsensitiveContains("numbers") == true {
            let number = String(nftName.filter(\.isNumber))
            guard !number.isEmpty else { return nil }
            return URL(string: "https://fragment.com/number/\(number)")
        }

        let username = nftName.hasPrefix("@") ? String(nftName.dropFirst()) : nftName
        guard
            let encodedUsername = username.nilIfEmpty?.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed)
        else {
            return nil
        }
        return URL(string: "https://fragment.com/username/\(encodedUsername)")
    }
}

#if DEBUG

public extension ApiNft {
    static let sample = ApiNft(
        index: 11,
        ownerAddress: "ownerAddress",
        name: "Name",
        address: "address",
        thumbnail: "https://cache.tonapi.io/imgproxy/cpzE8mRkip07F_buTfatuubNcCIRRQtRGmgRSo5ffc8/rs:fill:1500:1500:1/g:no/aXBmczovL1FtVUJhM291dlh4TDhMRWdHamhweHlaaVgyWEcyUmd4a1hhWlNmdlNmeHBTRXM.webp",
        image: "https://cache.tonapi.io/imgproxy/cpzE8mRkip07F_buTfatuubNcCIRRQtRGmgRSo5ffc8/rs:fill:1500:1500:1/g:no/aXBmczovL1FtVUJhM291dlh4TDhMRWdHamhweHlaaVgyWEcyUmd4a1hhWlNmdlNmeHBTRXM.webp",
        description: "description",
        collectionName: "Collection name",
        collectionAddress: "collectionAddress",
        isOnSale: false,
        isHidden: false,
        isOnFragment: false,
        isScam: false,
        metadata: .init(
            lottie: nil,
            imageUrl: nil,
            fragmentUrl: nil
        )
    )
}

#endif
