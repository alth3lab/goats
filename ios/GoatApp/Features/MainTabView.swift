import SwiftUI

/// التبويبات الرئيسية
struct MainTabView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var appState: AppState
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // الرئيسية
            NavigationStack {
                DashboardView()
            }
            .tabItem {
                Image(systemName: "house.fill")
                Text("الرئيسية")
            }
            .tag(0)
            
            // المواشي
            NavigationStack {
                GoatListView()
            }
            .tabItem {
                Image(systemName: "pawprint.fill")
                Text("المواشي")
            }
            .tag(1)
            
            // الصحة
            NavigationStack {
                HealthListView()
            }
            .tabItem {
                Image(systemName: "heart.fill")
                Text("الصحة")
            }
            .tag(2)
            
            // التزاوج
            NavigationStack {
                BreedingListView()
            }
            .tabItem {
                Image(systemName: "heart.circle.fill")
                Text("التزاوج")
            }
            .tag(3)
            
            // المزيد
            NavigationStack {
                MoreMenuView()
            }
            .tabItem {
                Image(systemName: "ellipsis.circle.fill")
                Text("المزيد")
            }
            .tag(4)
        }
        .tint(.accentGreen)
    }
}
