import Foundation
import SwiftUI
import UIKit
import UIComponents
import UIPasscode
import WalletCore
import WalletContext
import Perception

@MainActor
public final class NetworkDetailVC: SettingsBaseVC {

    private let chain: String
    private let screenTitle: String
    private let initiallyHidden: Bool
    private let canDisableInitially: Bool
    private var hostingController: UIHostingController<NetworkDetailView>?

    public init(chain: String, title: String, isHidden: Bool = false, canDisable: Bool = true) {
        self.chain = chain
        self.screenTitle = title
        self.initiallyHidden = isHidden
        self.canDisableInitially = canDisable
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    public override func viewDidLoad() {
        super.viewDidLoad()
        navigationItem.title = screenTitle
        view.backgroundColor = .air.groupedBackground
        hostingController = addHostingController(
            NetworkDetailView(
                chain: chain,
                initiallyHidden: initiallyHidden,
                canDisableInitially: canDisableInitially
            ),
            constraints: .fill
        )
    }
}

struct NetworkDetailView: View {
    let chain: String
    let initiallyHidden: Bool
    let canDisableInitially: Bool

    @State private var fields: [ApiNetworkRpcFieldConfig] = []
    @State private var isHidden: Bool
    @State private var canDisable: Bool
    @State private var isTogglingVisibility = false

    init(chain: String, initiallyHidden: Bool, canDisableInitially: Bool) {
        self.chain = chain
        self.initiallyHidden = initiallyHidden
        self.canDisableInitially = canDisableInitially
        _isHidden = State(initialValue: initiallyHidden)
        _canDisable = State(initialValue: canDisableInitially)
    }

    private var canToggleVisibility: Bool {
        isHidden || canDisable
    }

    var body: some View {
        WithPerceptionTracking {
            InsetList(topPadding: 16, spacing: 24) {
                visibilitySection
                ForEach(fields, id: \.field) { field in
                    NetworkFieldSection(chain: chain, field: field, onSaved: reload)
                }
                warningSection
            }
            .task {
                await reload()
            }
        }
    }

    private var visibilitySection: some View {
        InsetSection {
            InsetCell {
                Toggle(isOn: Binding(
                    get: { !isHidden },
                    set: { newValue in
                        guard canToggleVisibility || newValue else { return }
                        Task { await setVisibility(isHidden: !newValue) }
                    }
                )) {
                    Text(lang("Show in wallet"))
                }
                .disabled(isTogglingVisibility || !canToggleVisibility)
                .padding(.vertical, 4)
            }
            if !canToggleVisibility {
                InsetCell {
                    Text(lang("At least one network must stay enabled."))
                        .font(.footnote)
                        .foregroundStyle(Color.air.secondaryLabel)
                        .padding(.vertical, 4)
                }
            }
        }
    }

    private var warningSection: some View {
        InsetSection {
            InsetCell {
                Text(
                    lang("Custom endpoints that do not support indexer APIs may disable NFT and activity features for this network.")
                )
                .font(.footnote)
                .foregroundStyle(Color.air.secondaryLabel)
                .padding(.vertical, 8)
            }
        }
    }

    private func reload() async {
        do {
            let network = AccountStore.activeNetwork
            let config = try await Api.getRpcConfig(network: network)
            guard let item = config.first(where: { $0.chain == chain }) else { return }
            let visibleCount = config.reduce(0) { $0 + ($1.isHidden == true ? 0 : 1) }
            await MainActor.run {
                fields = item.fields
                isHidden = item.isHidden == true
                canDisable = item.isHidden == true || visibleCount > 1
            }
        } catch {
            // Keep previous fields on failure
        }
    }

    private func setVisibility(isHidden nextHidden: Bool) async {
        if nextHidden && !canDisable {
            return
        }
        isTogglingVisibility = true
        defer { isTogglingVisibility = false }
        do {
            let result = try await Api.setChainVisibility(
                chain: chain,
                network: AccountStore.activeNetwork,
                isHidden: nextHidden
            )
            guard result.ok else {
                await reload()
                return
            }
            isHidden = nextHidden
            await reload()
        } catch {
            // Revert on failure via reload
            await reload()
        }
    }
}

private struct NetworkFieldSection: View {
    let chain: String
    let field: ApiNetworkRpcFieldConfig
    let onSaved: () async -> Void

    private enum StatusKind {
        case success, warning, error

        var color: Color {
            switch self {
            case .success: return Color.air.positiveAmount
            case .warning: return .orange
            case .error: return Color.air.error
            }
        }
    }

    @State private var draftUrl: String
    @State private var draftApiKey: String
    @State private var isApiKeyUnlocked = false
    @State private var statusText: String?
    @State private var statusKind: StatusKind = .error
    @State private var showSaveAnyway = false
    @State private var isSaving = false
    @State private var sessionPassword: String?

    private var isApiField: Bool { field.field == "api" }
    private var fieldLabel: String { isApiField ? lang("API URL") : lang("RPC URL") }
    private var showApiKey: Bool {
        SharedNetworksConfig.isApiKeyEligible(chain: chain, field: field.field)
    }

    init(chain: String, field: ApiNetworkRpcFieldConfig, onSaved: @escaping () async -> Void) {
        self.chain = chain
        self.field = field
        self.onSaved = onSaved
        _draftUrl = State(initialValue: field.url)
        _draftApiKey = State(initialValue: field.apiKey ?? "")
    }

    var body: some View {
        endpointSection
            .onChange(of: field) { _, newField in
                draftUrl = newField.url
                draftApiKey = newField.apiKey ?? ""
            }
        actionsSection
    }

    private var endpointSection: some View {
        InsetSection {
            InsetCell {
                VStack(alignment: .leading, spacing: 8) {
                    Text(
                        if (field.isDefault) {
                            if (isApiField && field.defaultUrl.isEmpty) {
                                lang("Enhanced API disabled")
                            } else {
                                lang("Using default endpoint")
                            }
                        } else {
                            lang("Using custom endpoint")
                        }
                    )
                        .font(.footnote)
                        .foregroundStyle(Color.air.secondaryLabel)

                    if (isApiField && field.isDefault && field.defaultUrl.isEmpty) {
                        Text(
                            lang("Enhanced features (activities, NFTs, live updates) are disabled. Add an API URL (+key) to enable them.")
                        )
                        .font(.footnote)
                        .foregroundStyle(Color.air.secondaryLabel)
                    }

                    TextField(
                        "",
                        text: $draftUrl,
                        prompt: Text(
                            field.defaultUrl.isEmpty
                                ? (isApiField ? "https://eth-mainnet.g.alchemy.io/v2/" : lang("Enter URL"))
                                : field.defaultUrl
                        )
                    )
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)

                    if showApiKey {
                        if !isApiKeyUnlocked {
                            Button(lang("Show API Key")) {
                                unlockApiKey()
                            }
                            .padding(.top, 4)
                        } else {
                            SecureField(
                                lang(field.field == "api" ? "Enhanced API Key" : "API Key"),
                                text: $draftApiKey
                            )
                        }
                    }

                    if let statusText {
                        Text(statusText)
                            .font(.footnote)
                            .foregroundStyle(statusKind.color)
                    }
                }
                .padding(.vertical, 8)
            }
        } header: {
            Text(fieldLabel)
        }
    }

    private var actionsSection: some View {
        InsetSection {
            InsetButtonCell(alignment: .center, action: { Task { await save(force: false) } }) {
                Text(isSaving ? lang("Please wait...") : lang("Save"))
                    .foregroundStyle(Color.air.tint)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .disabled(isSaving)
            if showSaveAnyway {
                InsetButtonCell(alignment: .center, action: { Task { await save(force: true) } }) {
                    Text(lang("Save Anyway"))
                        .foregroundStyle(Color.air.tint)
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
            }
            if !field.isDefault {
                InsetButtonCell(alignment: .center, action: { Task { await reset() } }) {
                    Text(lang("Reset to Default"))
                        .foregroundStyle(Color.air.tint)
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
            }
        }
    }

    private func save(force: Bool) async {
        let needsPassword = showApiKey
            && isApiKeyUnlocked
            && !draftApiKey.isEmpty
            && sessionPassword == nil
        if needsPassword {
            unlockApiKey(andSaveForce: force)
            return
        }

        isSaving = true
        showSaveAnyway = false
        defer { isSaving = false }

        do {
            let apiKey: String? = (showApiKey && isApiKeyUnlocked)
                ? (draftApiKey.isEmpty ? nil : draftApiKey)
                : nil
            let result = try await Api.setRpcOverride(
                chain: chain,
                network: AccountStore.activeNetwork,
                field: field.field,
                url: draftUrl,
                apiKey: apiKey,
                force: force,
                password: sessionPassword
            )
            applySaveResult(result)
            if result.saved == true {
                await onSaved()
            }
        } catch {
            statusText = error.localizedDescription
            statusKind = .error
        }
    }

    private func applySaveResult(_ result: ApiRpcTestResult) {
        switch result.status {
        case "ok":
            statusText = lang("Saved")
            statusKind = .success
            showSaveAnyway = false
        case "unexpected_response":
            statusText = result.details ?? lang("Unexpected response from endpoint")
            statusKind = .warning
            showSaveAnyway = result.saved != true
        default:
            statusText = result.details ?? lang("Endpoint is unreachable")
            statusKind = .error
            showSaveAnyway = false
        }
    }

    private func reset() async {
        do {
            _ = try await Api.resetRpcOverride(
                chain: chain,
                network: AccountStore.activeNetwork,
                field: field.field
            )
            statusText = lang("Saved")
            statusKind = .success
            showSaveAnyway = false
            isApiKeyUnlocked = false
            draftApiKey = ""
            await onSaved()
        } catch {
            statusText = error.localizedDescription
            statusKind = .error
        }
    }

    private func unlockApiKey(andSaveForce: Bool? = nil) {
        Task { @MainActor in
            guard let host = topWViewController() else { return }
            if let password = await UnlockVC.presentAuthAsync(on: host, title: lang("API Key")) {
                do {
                    let unlocked = try await Api.unlockRpcApiKey(
                        chain: chain,
                        network: AccountStore.activeNetwork,
                        password: password,
                        field: field.field
                    )
                    if unlocked.ok {
                        sessionPassword = password
                        draftApiKey = unlocked.apiKey ?? draftApiKey
                        isApiKeyUnlocked = true
                        if let andSaveForce {
                            await save(force: andSaveForce)
                        }
                    } else {
                        statusText = lang("Wrong password, please try again.")
                        statusKind = .error
                    }
                } catch {
                    statusText = error.localizedDescription
                    statusKind = .error
                }
            }
        }
    }
}
