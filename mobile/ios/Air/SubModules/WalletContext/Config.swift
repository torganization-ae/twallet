
import Foundation

public let SINGLETON_TABLE_ROW_ID: Int64 = 0

// reference: src/config.ts

public let NATIVE_BIOMETRICS_USERNAME = "Twallet"
public let NATIVE_BIOMETRICS_SERVER = "https://mytonwallet.app"

public let PRICELESS_TOKEN_HASHES: Set<String?> = [
  "82566ad72b6568fe7276437d3b0c911aab65ed701c13601941b2917305e81c11", // Stonfi V1
  "ec614ea4aaea3f7768606f1c1632b3374d3de096a1e7c4ba43c8009c487fee9d", // Stonfi V2
  "c0f9d14fbc8e14f0d72cba2214165eee35836ab174130912baf9dbfa43ead562", // Dedust (for example, EQBkh7Mc411WTYF0o085MtwJpYpvGhZOMBphhIFzEpzlVODp)
  "1275095b6da3911292406f4f4386f9e780099b854c6dee9ee2895ddce70927c1", // Dedust (for example, EQCm92zFBkLe_qcFDp7WBvI6JFSDsm4WbDPvZ7xNd7nPL_6M)
  "5d01684bdf1d5c9be2682c4e36074202432628bd3477d77518d66b0976b78cca", // USDT Storm LP (for example, EQAzm06UMMsnFQrNKEubV1myIR-mm2ZOCnoic36frCgD8MLR)
]

public let MYTONWALLET_MULTISEND_DAPP_URL = "https://multisend.mywallet.io/";

public let NFT_MARKETPLACE_URL = "https://opensea.io/"
public let NFT_MARKETPLACE_TITLE = "OpenSea"
public let TON_NFT_MARKETPLACE_URL = "https://fragment.com/"
public let TON_NFT_MARKETPLACE_TITLE = "Fragment"

public let BURN_ADDRESS = "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ"

public let TINY_TRANSFER_MAX_COST = 0.01

public let TELEGRAM_GIFTS_SUPER_COLLECTION = "super:telegram-gifts"

public let JVAULT_URL = "https://jvault.xyz"

public let MAX_PRICE_IMPACT_VALUE = 5.0

public let JSBRIDGE_IDENTIFIER = "jsbridge"

public let APP_WEBSITE_URL = "https://mywallet.io"
public let APP_BLOG_URL = "https://mywallet.io/en/blog/"
public let APP_TERMS_OF_USE_URL = "https://mywallet.io/terms-of-use/"
public let APP_PRIVACY_POLICY_URL = "https://mywallet.io/privacy-policy/"
public let APP_INSTALL_URL = "https://wallet.tmail.ae/downloads"
public let SUPPORT_USERNAME = "mysupport"

public let MTW_TIPS_CHANNEL_NAME = "MyTonWalletTips"
public let MTW_TIPS_CHANNEL_NAME_RU = "MyTonWalletTipsRu"
public let MFA_BOT_URL = "https://t.me/tgmfabot/auth"

public func buildMfaBotUrl(startApp: String) -> URL? {
    guard var components = URLComponents(string: MFA_BOT_URL) else {
        return nil
    }
    components.queryItems = [
        URLQueryItem(name: "startapp", value: "m_\(startApp)"),
    ]
    return components.url
}

public let TMAIL_APP_URL = URL(string: "https://tmail.ae")!

public let HELP_CENTER_URL = "https://help.mywallet.io"
public let HELP_CENTER_URL_RU = "https://help.mywallet.io/ru"
public let HELP_CENTER_DOMAIN_SCAM_URL = "https://help.mywallet.io/intro/scams/.ton-domain-scams"
public let HELP_CENTER_DOMAIN_SCAM_URL_RU = "https://help.mywallet.io/ru/baza-znanii/moshennichestvo-i-skamy/moshennichestvo-s-ispolzovaniem-domenov-.ton"
public let HELP_CENTER_SEED_SCAM_URL = "https://help.mywallet.io/intro/scams/leaked-seed-phrases"
public let HELP_CENTER_SEED_SCAM_URL_RU = "https://help.mywallet.io/ru/baza-znanii/moshennichestvo-i-skamy/slitye-sid-frazy"
public var DOMAIN_SCAM_REGEX: Regex<Substring> { /^[-\w]{26,}\./ }

public let CARD_RATIO: CGFloat = 176/358
public let SMALL_CARD_RATIO: CGFloat = 116/80
public let MEDIUM_CARD_RATIO: CGFloat = 110/75
public let LARGE_CARD_RATIO: CGFloat = 274/176

public let APP_NAME = "TWallet"

public enum DebugProductionMode {
    public static let userDefaultsKey = "debug_forceProductionMode"

    public static var isEnabled: Bool {
        UserDefaults.standard.bool(forKey: userDefaultsKey)
    }
}

public let APP_ROOT_URL_DOMAINS = [ "mytonwallet.io", "mywallet.io" ]

public var IS_DEBUG_OR_TESTFLIGHT_DEFAULT: Bool {
    #if DEBUG
    return true
    #else
    return Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
    #endif
}

public var IS_DEBUG_OR_TESTFLIGHT: Bool {
    !DebugProductionMode.isEnabled && IS_DEBUG_OR_TESTFLIGHT_DEFAULT
}

public let SELF_PROTOCOL_SCHEME = "twallet"
public let TONCONNECT_PROTOCOL_SCHEME = "twallet-tc"
public var SELF_PROTOCOL: String { "\(SELF_PROTOCOL_SCHEME)://" }
public let TONCONNECT_UNIVERSAL_URL = "https://connect.mytonwallet.org"
public let SHORT_UNIVERSAL_URL = "https://my.tt/"
public let SELF_UNIVERSAL_URLS = [SHORT_UNIVERSAL_URL, "https://go.mytonwallet.org/"]
public let SELF_UNIVERSAL_URL_HOSTS: Set<String> = ["go.mytonwallet.org", "my.tt"]
