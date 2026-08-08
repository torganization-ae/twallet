import Dependencies
import Foundation
import GRDB
import Perception
import WalletContext

private let log = Log("AssetsAndActivityDataStore")

public var AssetsAndActivityDataStore: _AssetsAndActivityDataStore { _AssetsAndActivityDataStore.shared }

public final class AccountAssetsAndActivityData: Sendable {
    @Perceptible
    public final class State: Sendable {
        private let _data: UnfairLock<MAssetsAndActivityData?> = .init(initialState: nil)

        nonisolated init() {}

        public var data: MAssetsAndActivityData? {
            access(keyPath: \._data)
            return _data.withLock { $0 }
        }

        fileprivate func replace(data: MAssetsAndActivityData?) {
            withMutation(keyPath: \._data) {
                _data.withLock { $0 = data }
            }
        }
    }

    public let accountId: String
    public let state = State()

    init(accountId: String) {
        self.accountId = accountId
    }

    public var data: MAssetsAndActivityData? {
        state.data
    }

    func replace(data: MAssetsAndActivityData?) {
        state.replace(data: data)
    }
}

public actor _AssetsAndActivityDataStore: WalletCoreData.EventsObserver {
    public static let shared = _AssetsAndActivityDataStore()

    private let byAccountId: ByAccountIdStore<AccountAssetsAndActivityData> = .init(initialValue: { AccountAssetsAndActivityData(accountId: $0) })
    private var db: (any DatabaseWriter)?

    private init() {}

    public nonisolated func `for`(accountId: String) -> AccountAssetsAndActivityData {
        byAccountId.for(accountId: accountId)
    }

    public nonisolated func data(accountId: String) -> MAssetsAndActivityData? {
        self.for(accountId: accountId).data
    }

    public func use(db: any DatabaseWriter) {
        self.db = db
        loadFromDb()
        WalletCoreData.add(eventObserver: self)
    }

    public func clean() {
        byAccountId.removeAll()
    }

    public nonisolated func update(accountId: String, update: @escaping @Sendable (inout MAssetsAndActivityData) -> Void) {
        Task { await self._update(accountId: accountId, update: update) }
    }

    @MainActor public func walletCore(event: WalletCoreData.Event) {
        Task {
            await handleEvent(event)
        }
    }

    private func handleEvent(_ event: WalletCoreData.Event) {
        switch event {
        case .accountDeleted(let accountId):
            byAccountId.existing(accountId: accountId)?.replace(data: nil)
            byAccountId.remove(accountId: accountId)
        case .accountsReset:
            clean()
        default:
            break
        }
    }

    private func _update(accountId: String, update: @escaping @Sendable (inout MAssetsAndActivityData) -> Void) {
        let context = byAccountId.for(accountId: accountId)
        var next = context.data ?? .empty
        update(&next)
        persist(accountId: accountId, data: next)
    }

    private func persist(
        accountId: String,
        data: MAssetsAndActivityData
    ) {
        let context = byAccountId.for(accountId: accountId)
        guard context.data != data else { return }

        context.replace(data: data)

        do {
            guard let db else {
                assertionFailure("database not ready")
                return
            }
            let row = MAccountAssetsAndActivityData(
                accountId: accountId,
                data: data
            )
            try db.write { db in
                try row.upsert(db)
            }
        } catch {
            log.error("save failed accountId=\(accountId, .public) error=\(error, .public)")
        }

        WalletCoreData.notify(event: .assetsAndActivityDataUpdated)
    }

    private func loadFromDb() {
        do {
            guard let db else {
                assertionFailure("database not ready")
                return
            }
            let rows = try db.read { db in
                try MAccountAssetsAndActivityData.fetchAll(db)
            }
            for row in rows {
                var data = row.data
                let before = data
                data.dropLegacyStakingIdentities()
                byAccountId.for(accountId: row.accountId).replace(data: data)
                if data != before {
                    persist(accountId: row.accountId, data: data)
                }
            }
        } catch {
            log.error("initial load failed: \(error, .public)")
        }
    }
}

extension _AssetsAndActivityDataStore: DependencyKey {
    public static let liveValue: _AssetsAndActivityDataStore = .shared
}

public extension DependencyValues {
    var assetsAndActivityDataStore: _AssetsAndActivityDataStore {
        get { self[_AssetsAndActivityDataStore.self] }
        set { self[_AssetsAndActivityDataStore.self] = newValue }
    }
}
