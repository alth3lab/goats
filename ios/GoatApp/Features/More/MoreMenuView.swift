import SwiftUI

/// قائمة المزيد - الأقسام الفرعية والإعدادات
struct MoreMenuView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        List {
            // Farm Management
            Section("إدارة المزرعة") {
                NavigationLink {
                    FeedsListView()
                } label: {
                    MenuRow(icon: "leaf.fill", title: "الأعلاف", color: .accentGreen)
                }
                
                NavigationLink {
                    PensListView()
                } label: {
                    MenuRow(icon: "square.grid.2x2.fill", title: "الحظائر", color: .infoBlue)
                }
                
                NavigationLink {
                    SalesListView()
                } label: {
                    MenuRow(icon: "banknote.fill", title: "المبيعات", color: .purple)
                }
                
                NavigationLink {
                    ExpensesListView()
                } label: {
                    MenuRow(icon: "creditcard.fill", title: "المصاريف", color: .dangerRed)
                }
            }
            
            // Account
            Section("الحساب") {
                NavigationLink {
                    ProfileView()
                } label: {
                    MenuRow(icon: "person.fill", title: "حسابي", color: .accentGreen)
                }
                
                Button(action: { appState.showingFarmPicker = true }) {
                    MenuRow(icon: "building.2.fill", title: "تبديل المزرعة", color: .infoBlue)
                }
            }
            
            // Info
            Section {
                HStack {
                    if let farm = appState.currentFarm {
                        Text(farm.displayName)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Text("المزرعة الحالية")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text(authManager.currentUser?.role ?? "")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("الدور")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("1.0.0")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("إصدار التطبيق")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Logout
            Section {
                Button(action: { authManager.logout() }) {
                    HStack {
                        Spacer()
                        Text("تسجيل الخروج")
                            .foregroundColor(.dangerRed)
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .foregroundColor(.dangerRed)
                    }
                }
            }
        }
        .navigationTitle("المزيد")
    }
}

// MARK: - Menu Row

struct MenuRow: View {
    let icon: String
    let title: String
    let color: Color
    
    var body: some View {
        HStack {
            Spacer()
            Text(title)
                .foregroundColor(.primary)
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 28)
        }
    }
}

// MARK: - Expenses List

struct ExpensesListView: View {
    @StateObject private var viewModel = ExpensesViewModel()
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.expenses.isEmpty {
                VStack(spacing: AppSpacing.md) {
                    Image(systemName: "creditcard")
                        .font(.system(size: 50))
                        .foregroundColor(.gray.opacity(0.4))
                    Text("لا توجد مصاريف")
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(viewModel.expenses) { expense in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(expense.date.formatted(.dateTime.day().month()))
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("\(String(format: "%.0f", expense.amount)) \(appState.currency)")
                                .font(.subheadline.bold())
                                .foregroundColor(.dangerRed)
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(expense.description ?? expense.categoryAr)
                                .font(.headline)
                            Text(expense.categoryAr)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("المصاريف")
        .refreshable { await viewModel.loadExpenses() }
        .task { await viewModel.loadExpenses() }
    }
}

@MainActor
class ExpensesViewModel: ObservableObject {
    @Published var expenses: [Expense] = []
    @Published var isLoading = false
    
    func loadExpenses() async {
        isLoading = true
        do { expenses = try await APIClient.shared.get("/api/expenses") } catch {}
        isLoading = false
    }
}

// MARK: - Profile View

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        List {
            Section {
                HStack {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(authManager.currentUser?.fullName ?? "")
                            .font(.title3.bold())
                        Text(authManager.currentUser?.username ?? "")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Text(roleLabel)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.surfaceGreen)
                            .cornerRadius(4)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.accentGreen)
                }
            }
        }
        .navigationTitle("حسابي")
    }
    
    private var roleLabel: String {
        switch authManager.currentUser?.role {
        case "SUPER_ADMIN": return "مدير النظام"
        case "OWNER": return "مالك"
        case "ADMIN": return "مدير"
        case "MANAGER": return "مشرف"
        case "VETERINARIAN": return "بيطري"
        case "USER": return "مستخدم"
        case "VIEWER": return "مشاهد"
        default: return authManager.currentUser?.role ?? ""
        }
    }
}
