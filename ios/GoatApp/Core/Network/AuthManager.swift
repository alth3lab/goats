import SwiftUI
import Combine

/// مدير المصادقة - يدير تسجيل الدخول/الخروج وحالة الجلسة
@MainActor
final class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var isAuthenticated = false
    @Published var isLoading = true
    @Published var currentUser: UserInfo?
    @Published var error: String?
    
    private init() {
        Task { await checkAuth() }
    }
    
    /// التحقق من الجلسة عند فتح التطبيق
    func checkAuth() async {
        isLoading = true
        defer { isLoading = false }
        
        guard KeychainHelper.hasToken else {
            isAuthenticated = false
            return
        }
        
        do {
            // محاولة تجديد التوكن
            let response: TokenRefreshResult = try await APIClient.shared.post("/api/auth/refresh")
            saveToken(response.token)
            
            // جلب بيانات المستخدم
            await loadCurrentUser()
            isAuthenticated = true
        } catch {
            // التوكن منتهي أو غير صالح
            KeychainHelper.deleteToken()
            isAuthenticated = false
        }
    }
    
    /// تسجيل الدخول
    func login(identifier: String, password: String) async throws {
        let body = LoginRequest(identifier: identifier, password: password)
        let response: LoginResponse = try await APIClient.shared.post("/api/auth/login", body: body)
        
        saveToken(response.token)
        currentUser = UserInfo(
            id: response.id,
            fullName: response.fullName,
            role: response.role,
            tenantId: response.tenantId,
            farmId: response.farmId
        )
        isAuthenticated = true
        
        // Load full user data and register device
        await AppState.shared.loadUserData()
        await registerDevice()
    }
    
    /// تسجيل الخروج
    func logout() {
        Task {
            // إلغاء تسجيل الجهاز
            await unregisterDevice()
            
            // تسجيل خروج من الخادم
            try? await APIClient.shared.post("/api/auth/logout") as SuccessResponse
        }
        
        KeychainHelper.deleteToken()
        currentUser = nil
        isAuthenticated = false
        AppState.shared.currentFarm = nil
        AppState.shared.farms = []
        AppState.shared.permissions = []
    }
    
    /// حفظ التوكن
    func saveToken(_ token: String) {
        KeychainHelper.saveToken(token)
    }
    
    // MARK: - Private
    
    private func loadCurrentUser() async {
        do {
            let me: MeResponse = try await APIClient.shared.get("/api/auth/me")
            currentUser = me.user
            AppState.shared.permissions = me.permissions
            AppState.shared.farms = me.farms
            AppState.shared.currentFarm = me.farm
        } catch {
            self.error = error.localizedDescription
        }
    }
    
    private func registerDevice() async {
        // تسجيل الجهاز لاستقبال الإشعارات لاحقاً
        // TODO: سيتم الربط مع APNs
    }
    
    private func unregisterDevice() async {
        // TODO: إلغاء تسجيل الجهاز عند الخروج
    }
}

// MARK: - Request/Response Types

private struct LoginRequest: Encodable {
    let identifier: String
    let password: String
}

private struct TokenRefreshResult: Decodable {
    let token: String
    let expiresIn: Int
}
