//
//  SdkAssetSchemeHandler.swift
//  WalletCore
//

import Foundation
import WebKit

/// Serves bundled `JS/` files to the hidden SDK WebView under `twallet-sdk://`.
/// Paths match Android WebViewAssetLoader: `/assets/js/index.html`.
final class SdkAssetSchemeHandler: NSObject, WKURLSchemeHandler {
    private let lock = NSLock()
    private var stopped = Set<ObjectIdentifier>()

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        let taskId = ObjectIdentifier(urlSchemeTask)
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(SdkAssetSchemeError.invalidURL)
            return
        }

        guard let fileURL = Self.bundleFileURL(for: url) else {
            finish(urlSchemeTask, taskId: taskId, status: 404, mime: "text/plain", data: Data())
            return
        }

        do {
            let data = try Data(contentsOf: fileURL)
            finish(
                urlSchemeTask,
                taskId: taskId,
                status: 200,
                mime: Self.mimeType(for: fileURL),
                data: data,
                requestURL: url
            )
        } catch {
            fail(urlSchemeTask, taskId: taskId, error: error)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        lock.lock()
        stopped.insert(ObjectIdentifier(urlSchemeTask))
        lock.unlock()
    }

    private func finish(
        _ task: WKURLSchemeTask,
        taskId: ObjectIdentifier,
        status: Int,
        mime: String,
        data: Data,
        requestURL: URL? = nil
    ) {
        let url = requestURL ?? task.request.url!
        let response = HTTPURLResponse(
            url: url,
            statusCode: status,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": mime,
                "Cache-Control": "no-store",
            ]
        )!
        lock.lock()
        let isStopped = stopped.contains(taskId)
        lock.unlock()
        guard !isStopped else { return }
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    private func fail(_ task: WKURLSchemeTask, taskId: ObjectIdentifier, error: Error) {
        lock.lock()
        let isStopped = stopped.contains(taskId)
        lock.unlock()
        guard !isStopped else { return }
        task.didFailWithError(error)
    }

    /// `/assets/js/foo` → `JS/foo` inside the app bundle. Rejects path escape.
    static func bundleFileURL(for url: URL) -> URL? {
        let path = url.path
        let prefix = "/assets/js/"
        guard path.hasPrefix(prefix) else { return nil }
        let name = String(path.dropFirst(prefix.count))
        guard !name.isEmpty, !name.contains("..") else { return nil }
        guard let jsDir = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "JS")?
            .deletingLastPathComponent()
            .standardizedFileURL else {
            return nil
        }
        let resolved = jsDir.appendingPathComponent(name).standardizedFileURL
        let dirPath = jsDir.path.hasSuffix("/") ? jsDir.path : jsDir.path + "/"
        guard resolved.path.hasPrefix(dirPath) else { return nil }
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: resolved.path, isDirectory: &isDirectory),
              !isDirectory.boolValue else {
            return nil
        }
        return resolved
    }

    static func mimeType(for fileURL: URL) -> String {
        switch fileURL.pathExtension.lowercased() {
        case "html", "htm": return "text/html"
        case "js": return "text/javascript"
        case "json", "map": return "application/json"
        case "css": return "text/css"
        case "png": return "image/png"
        case "svg": return "image/svg+xml"
        default: return "application/octet-stream"
        }
    }
}

private enum SdkAssetSchemeError: Error {
    case invalidURL
}
