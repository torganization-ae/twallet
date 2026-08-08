//
//  UpdateConfig.swift
//  WalletCore
//
//  Created by nikstar on 11.08.2025.
//

import Foundation

extension ApiUpdate {
    
    public struct UpdateConfig: Equatable, Hashable, Codable, Sendable {
        public var type = "updateConfig"
        public var isLimited: Bool?
        public var isCopyStorageEnabled: Bool?
        public var supportAccountsCount: Int?
        public var isAppUpdateRequired: Bool?
        public var knowledgeBaseVersion: String?

        private enum CodingKeys: String, CodingKey {
            case type
            case isLimited
            case isCopyStorageEnabled
            case supportAccountsCount
            case isAppUpdateRequired
            case knowledgeBaseVersion
        }

        public init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            type = try container.decodeIfPresent(String.self, forKey: .type) ?? "updateConfig"
            isLimited = try container.decodeIfPresent(Bool.self, forKey: .isLimited)
            isCopyStorageEnabled = try container.decodeIfPresent(Bool.self, forKey: .isCopyStorageEnabled)
            supportAccountsCount = try container.decodeIfPresent(Int.self, forKey: .supportAccountsCount)
            isAppUpdateRequired = try container.decodeIfPresent(Bool.self, forKey: .isAppUpdateRequired)
            knowledgeBaseVersion = try? container.decodeIfPresent(String.self, forKey: .knowledgeBaseVersion)
        }
    }
}
