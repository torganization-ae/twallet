//
//  SdkWebViewOrigin.swift
//  WalletCore
//

import Foundation

/// Hidden SDK WebView origin. Must match Android `https://<applicationId>` identity
/// (`com.sveves.twallet` on Play). WKWebView cannot intercept `https`, so iOS uses
/// a dedicated scheme; CORS lists `twallet-sdk://com.sveves.twallet` next to the
/// Android https origin. Override with Info.plist `TWalletSDKWebViewHost` if needed.
enum SdkWebViewOrigin {
    static let scheme = "twallet-sdk"

    static var host: String {
        let raw = Bundle.main.object(forInfoDictionaryKey: "TWalletSDKWebViewHost") as? String
        let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? "com.sveves.twallet" : trimmed
    }

    static var origin: String { "\(scheme)://\(host)" }

    static var indexURL: URL {
        URL(string: "\(scheme)://\(host)/assets/js/index.html")!
    }
}
