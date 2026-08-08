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

private struct FieldDraft: Equatable {
    var url: String
    var apiKey: String
    var isApiKeyUnlocked: Bool
    var isKeyVisible: Bool
    var statusText: String?
    var statusKind: StatusKind
    var needsSaveAnyway: Bool

    enum StatusKind: Equatable {
        case success, warning, error

        var color: Color {
            switch self {
            case .success: return Color.air.positiveAmount
            case .warning: return .orange
            case .error: return Color.air.error
            }
        }
    }
}

struct NetworkDetailView: View {
    let chain: String
    let initiallyHidden: Bool
    let canDisableInitially: Bool

    @State private var fields: [ApiNetworkRpcFieldConfig] = []
    @State private var drafts: [String: FieldDraft] = [:]
    @State private var isHidden: Bool
    @State private var canDisable: Bool
    @State private var isTogglingVisibility = false
    @State private var isSaving = false
    @State private var sessionPassword: String?
    @State private var showSaveAnyway = false

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
                    NetworkFieldSection(
                        field: field,
                        draft: binding(for: field.field),
                        onShowApiKey: { unlockApiKey(for: field.field) },
                        onReset: { Task { await reset(field: field.field) } }
                    )
                }
                actionsSection
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

    private var actionsSection: some View {
        InsetSection {
            InsetButtonCell(alignment: .center, action: { Task { await saveAll(force: false) } }) {
                Text(isSaving ? lang("Please wait...") : lang("Save"))
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .disabled(isSaving)
            if showSaveAnyway {
                InsetButtonCell(alignment: .center, action: { Task { await saveAll(force: true) } }) {
                    Text(lang("Save Anyway"))
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .disabled(isSaving)
            }
        }
    }

    private func binding(for fieldKey: String) -> Binding<FieldDraft> {
        Binding(
            get: {
                drafts[fieldKey] ?? FieldDraft(
                    url: "",
                    apiKey: "",
                    isApiKeyUnlocked: false,
                    isKeyVisible: false,
                    statusText: nil,
                    statusKind: .error,
                    needsSaveAnyway: false
                )
            },
            set: { drafts[fieldKey] = $0 }
        )
    }

    private func syncDrafts(from fields: [ApiNetworkRpcFieldConfig]) {
        var next = drafts
        for field in fields {
            let previous = next[field.field]
            let wasUnlocked = previous?.isApiKeyUnlocked == true
            next[field.field] = FieldDraft(
                url: field.url,
                apiKey: wasUnlocked ? (previous?.apiKey ?? "") : "",
                isApiKeyUnlocked: wasUnlocked || field.hasApiKey != true,
                isKeyVisible: wasUnlocked ? (previous?.isKeyVisible ?? false) : false,
                statusText: previous?.statusText,
                statusKind: previous?.statusKind ?? .error,
                needsSaveAnyway: previous?.needsSaveAnyway ?? false
            )
        }
        drafts = next
    }

    private func reload() async {
        do {
            let network = AccountStore.activeNetwork
            let config = try await Api.getRpcConfig(network: network)
            guard let item = config.first(where: { $0.chain == chain }) else { return }
            let visibleCount = config.reduce(0) { $0 + ($1.isHidden == true ? 0 : 1) }
            await MainActor.run {
                fields = item.fields
                syncDrafts(from: item.fields)
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
            await reload()
        }
    }

    private func fieldsNeedingPassword() -> [ApiNetworkRpcFieldConfig] {
        fields.filter { field in
            guard let draft = drafts[field.field] else { return false }
            return draft.isApiKeyUnlocked && !draft.apiKey.isEmpty
        }
    }

    private func saveAll(force: Bool) async {
        let needingPassword = fieldsNeedingPassword()
        if !needingPassword.isEmpty && sessionPassword == nil {
            unlockApiKey(for: needingPassword[0].field, andSaveForce: force)
            return
        }

        isSaving = true
        showSaveAnyway = false
        defer { isSaving = false }

        for field in fields {
            guard var draft = drafts[field.field] else { continue }
            do {
                let apiKey: String? = draft.isApiKeyUnlocked ? draft.apiKey : nil
                let result = try await Api.setRpcOverride(
                    chain: chain,
                    network: AccountStore.activeNetwork,
                    field: field.field,
                    url: draft.url,
                    apiKey: apiKey,
                    force: force,
                    password: sessionPassword
                )
                applySaveResult(result, to: &draft)
                drafts[field.field] = draft
            } catch {
                draft.statusText = error.localizedDescription
                draft.statusKind = .error
                draft.needsSaveAnyway = false
                drafts[field.field] = draft
            }
        }

        showSaveAnyway = drafts.values.contains(where: \.needsSaveAnyway)
        let allSaved = fields.allSatisfy { drafts[$0.field]?.statusKind == .success }
        if allSaved {
            await reload()
        }
    }

    private func applySaveResult(_ result: ApiRpcTestResult, to draft: inout FieldDraft) {
        switch result.status {
        case "ok":
            draft.statusText = lang("Saved")
            draft.statusKind = .success
            draft.needsSaveAnyway = false
        case "unexpected_response":
            draft.statusText = result.details ?? lang("Unexpected response from endpoint")
            draft.statusKind = .warning
            draft.needsSaveAnyway = result.saved != true
        default:
            draft.statusText = result.details ?? lang("Endpoint is unreachable")
            draft.statusKind = .error
            draft.needsSaveAnyway = false
        }
    }

    private func reset(field fieldKey: String) async {
        do {
            _ = try await Api.resetRpcOverride(
                chain: chain,
                network: AccountStore.activeNetwork,
                field: fieldKey
            )
            if var draft = drafts[fieldKey] {
                draft.statusText = lang("Saved")
                draft.statusKind = .success
                draft.needsSaveAnyway = false
                draft.isApiKeyUnlocked = false
                draft.apiKey = ""
                drafts[fieldKey] = draft
            }
            await reload()
        } catch {
            if var draft = drafts[fieldKey] {
                draft.statusText = error.localizedDescription
                draft.statusKind = .error
                drafts[fieldKey] = draft
            }
        }
    }

    private func unlockApiKey(for fieldKey: String, andSaveForce: Bool? = nil) {
        Task { @MainActor in
            guard let host = topWViewController() else { return }
            if let password = await UnlockVC.presentAuthAsync(on: host, title: lang("API Key")) {
                do {
                    let unlocked = try await Api.unlockRpcApiKey(
                        chain: chain,
                        network: AccountStore.activeNetwork,
                        password: password,
                        field: fieldKey
                    )
                    if unlocked.ok {
                        sessionPassword = password
                        if var draft = drafts[fieldKey] {
                            draft.apiKey = unlocked.apiKey ?? draft.apiKey
                            draft.isApiKeyUnlocked = true
                            draft.isKeyVisible = true
                            drafts[fieldKey] = draft
                        }
                        if let andSaveForce {
                            await saveAll(force: andSaveForce)
                        }
                    } else if var draft = drafts[fieldKey] {
                        draft.statusText = lang("Wrong password, please try again.")
                        draft.statusKind = .error
                        drafts[fieldKey] = draft
                    }
                } catch {
                    if var draft = drafts[fieldKey] {
                        draft.statusText = error.localizedDescription
                        draft.statusKind = .error
                        drafts[fieldKey] = draft
                    }
                }
            }
        }
    }
}

private struct NetworkFieldSection: View {
    let field: ApiNetworkRpcFieldConfig
    @Binding var draft: FieldDraft
    let onShowApiKey: () -> Void
    let onReset: () -> Void

    private var isApiField: Bool { field.field == "api" }
    private var fieldLabel: String { isApiField ? lang("API URL") : lang("RPC URL") }
    private var isKeyLocked: Bool { field.hasApiKey == true && !draft.isApiKeyUnlocked }

    var body: some View {
        endpointSection
        if !field.isDefault {
            resetSection
        }
    }

    private var endpointSection: some View {
        InsetSection {
            InsetCell {
                VStack(alignment: .leading, spacing: 8) {
                    TextField(
                        "",
                        text: $draft.url,
                        prompt: Text(
                            field.defaultUrl.isEmpty
                                ? (isApiField ? "https://eth-mainnet.g.alchemy.io/v2/" : lang("Enter URL"))
                                : field.defaultUrl
                        )
                    )
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .strokeBorder(Color.air.secondaryLabel.opacity(0.25), lineWidth: 1)
                    }

                    Text(lang("API Key"))
                        .font(.footnote)
                        .foregroundStyle(Color.air.secondaryLabel)

                    HStack(spacing: 8) {
                        Group {
                            if isKeyLocked {
                                TextField("", text: .constant(""), prompt: Text("••••••••"))
                                    .disabled(true)
                            } else if draft.isKeyVisible {
                                TextField(lang("Optional"), text: $draft.apiKey)
                            } else {
                                SecureField(lang("Optional"), text: $draft.apiKey)
                            }
                        }
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)

                        Button {
                            if isKeyLocked {
                                onShowApiKey()
                            } else {
                                draft.isKeyVisible.toggle()
                            }
                        } label: {
                            Image(systemName: isKeyLocked || !draft.isKeyVisible ? "eye" : "eye.slash")
                                .foregroundStyle(Color.air.secondaryLabel)
                        }
                        .buttonStyle(.plain)
                        .padding(.trailing, 8)
                    }
                    .background {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .strokeBorder(Color.air.secondaryLabel.opacity(0.25), lineWidth: 1)
                    }

                    if let statusText = draft.statusText {
                        Text(statusText)
                            .font(.footnote)
                            .foregroundStyle(draft.statusKind.color)
                    }
                }
                .padding(.vertical, 8)
            }
        } header: {
            Text(fieldLabel)
        }
    }

    private var resetSection: some View {
        InsetSection {
            InsetButtonCell(alignment: .center, action: onReset) {
                Text(lang("Reset to Default"))
                    .foregroundStyle(Color.air.tint)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
        }
    }
}
