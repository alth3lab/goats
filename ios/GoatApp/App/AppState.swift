import SwiftUI
import Combine

/// حالة التطبيق العامة - تدير المزرعة الحالية والإعدادات
@MainActor
final class AppState: ObservableObject {
    static let shared = AppState()
    
    @Published var currentFarm: Farm?
    @Published var farms: [FarmListItem] = []
    @Published var permissions: [String] = []
    @Published var showingFarmPicker = false
    @Published var networkError: String?
    
    private init() {}
    
    var farmType: String {
        currentFarm?.farmType ?? "SHEEP"
    }
    
    var currency: String {
        currentFarm?.currency ?? "SAR"
    }
    
    /// هل المستخدم يملك صلاحية معينة
    func hasPermission(_ permission: String) -> Bool {
        let user = AuthManager.shared.currentUser
        if let role = user?.role,
           ["SUPER_ADMIN", "OWNER", "ADMIN"].contains(role) {
            return true
        }
        return permissions.contains(permission)
    }
    
    /// تحميل بيانات المستخدم والمزرعة الحالية
    func loadUserData() async {
        do {
            let me: MeResponse = try await APIClient.shared.get("/api/auth/me")
            self.permissions = me.permissions
            self.farms = me.farms
            self.currentFarm = me.farm
        } catch {
            self.networkError = error.localizedDescription
        }
    }
    
    /// تبديل المزرعة
    func switchFarm(to farmId: String) async throws {
        let body = ["farmId": farmId]
        let response: FarmSwitchResponse = try await APIClient.shared.post("/api/farms/switch", body: body)
        AuthManager.shared.saveToken(response.token)
        await loadUserData()
    }
}
