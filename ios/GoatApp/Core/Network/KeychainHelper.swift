import Foundation
import Security

/// مساعد Keychain لتخزين JWT بشكل آمن
enum KeychainHelper {
    private static let service = "com.goatapp.auth"
    private static let tokenKey = "jwt_token"
    
    /// حفظ التوكن
    static func saveToken(_ token: String) {
        guard let data = token.data(using: .utf8) else { return }
        
        // حذف القيمة القديمة أولاً
        deleteToken()
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]
        
        SecItemAdd(query as CFDictionary, nil)
    }
    
    /// جلب التوكن
    static func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }
        
        return String(data: data, encoding: .utf8)
    }
    
    /// حذف التوكن
    static func deleteToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
        ]
        SecItemDelete(query as CFDictionary)
    }
    
    /// هل يوجد توكن
    static var hasToken: Bool {
        getToken() != nil
    }
}
