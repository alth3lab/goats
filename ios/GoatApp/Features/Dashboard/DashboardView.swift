import SwiftUI

/// لوحة التحكم الرئيسية
struct DashboardView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = DashboardViewModel()
    
    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.md) {
                // Farm header
                farmHeader
                
                if viewModel.isLoading {
                    ProgressView("جاري التحميل...")
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else if let stats = viewModel.stats {
                    // Quick Stats Grid
                    statsGrid(stats)
                    
                    // Financial Summary
                    financialCard(stats)
                    
                    // Quick Actions
                    quickActions
                    
                    // Alerts
                    if stats.pregnantGoats > 0 || stats.lowStockCount > 0 {
                        alertsSection(stats)
                    }
                } else if let error = viewModel.error {
                    errorView(error)
                }
            }
            .padding(AppSpacing.md)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("الرئيسية")
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { appState.showingFarmPicker = true }) {
                    HStack(spacing: 4) {
                        Image(systemName: "building.2")
                        Text(appState.currentFarm?.displayName ?? "اختر مزرعة")
                            .font(.caption)
                    }
                }
            }
        }
        .sheet(isPresented: $appState.showingFarmPicker) {
            FarmPickerView()
        }
        .refreshable {
            await viewModel.loadStats()
        }
        .task {
            await viewModel.loadStats()
        }
    }
    
    // MARK: - Farm Header
    
    private var farmHeader: some View {
        HStack {
            VStack(alignment: .trailing, spacing: 4) {
                Text("مرحباً \(authManager.currentUser?.fullName ?? "")")
                    .font(.title3.bold())
                Text(appState.currentFarm?.displayName ?? "")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Image(systemName: "pawprint.circle.fill")
                .font(.system(size: 44))
                .foregroundColor(.accentGreen)
        }
        .padding()
        .cardStyle()
    }
    
    // MARK: - Stats Grid
    
    private func statsGrid(_ stats: DashboardStats) -> some View {
        LazyVGrid(columns: [
            GridItem(.flexible()), GridItem(.flexible())
        ], spacing: AppSpacing.md) {
            StatCard(title: "إجمالي المواشي", value: "\(stats.totalGoats)", icon: "pawprint.fill", color: .accentGreen)
            StatCard(title: "النشطة", value: "\(stats.activeGoats)", icon: "checkmark.circle", color: .lightGreen)
            StatCard(title: "ذكور", value: "\(stats.maleGoats)", icon: "arrow.up.circle", color: .infoBlue)
            StatCard(title: "إناث", value: "\(stats.femaleGoats)", icon: "arrow.down.circle", color: .pink)
            StatCard(title: "حوامل", value: "\(stats.pregnantGoats)", icon: "heart.fill", color: .warningOrange)
            StatCard(title: "تزاوج نشط", value: "\(stats.activeBreedings)", icon: "heart.circle", color: .purple)
        }
    }
    
    // MARK: - Financial Card
    
    private func financialCard(_ stats: DashboardStats) -> some View {
        VStack(alignment: .trailing, spacing: AppSpacing.md) {
            Text("الملخص المالي")
                .font(.headline)
            
            HStack(spacing: AppSpacing.lg) {
                financialItem(
                    title: "المبيعات",
                    value: stats.totalSales,
                    color: .accentGreen,
                    icon: "arrow.up.circle.fill"
                )
                
                Divider().frame(height: 50)
                
                financialItem(
                    title: "المصاريف",
                    value: stats.totalExpenses,
                    color: .dangerRed,
                    icon: "arrow.down.circle.fill"
                )
                
                Divider().frame(height: 50)
                
                financialItem(
                    title: "صافي الربح",
                    value: stats.netProfit,
                    color: stats.netProfit >= 0 ? .accentGreen : .dangerRed,
                    icon: "banknote.fill"
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding()
        .cardStyle()
    }
    
    private func financialItem(title: String, value: Double, color: Color, icon: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundColor(color)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(formatCurrency(value))
                .font(.subheadline.bold())
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
    }
    
    // MARK: - Quick Actions
    
    private var quickActions: some View {
        VStack(alignment: .trailing, spacing: AppSpacing.sm) {
            Text("إجراءات سريعة")
                .font(.headline)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.md) {
                    QuickActionButton(title: "إضافة رأس", icon: "plus.circle.fill", color: .accentGreen) {}
                    QuickActionButton(title: "سجل صحي", icon: "heart.text.square.fill", color: .dangerRed) {}
                    QuickActionButton(title: "تزاوج جديد", icon: "heart.circle.fill", color: .purple) {}
                    QuickActionButton(title: "بيع", icon: "banknote.fill", color: .infoBlue) {}
                }
            }
        }
        .padding()
        .cardStyle()
    }
    
    // MARK: - Alerts
    
    private func alertsSection(_ stats: DashboardStats) -> some View {
        VStack(alignment: .trailing, spacing: AppSpacing.sm) {
            Text("تنبيهات")
                .font(.headline)
            
            if stats.pregnantGoats > 0 {
                alertRow(
                    icon: "exclamationmark.triangle.fill",
                    color: .warningOrange,
                    text: "\(stats.pregnantGoats) رأس حامل - تابع مواعيد الولادة"
                )
            }
            
            if stats.lowStockCount > 0 {
                alertRow(
                    icon: "exclamationmark.circle.fill",
                    color: .dangerRed,
                    text: "\(stats.lowStockCount) صنف علف منخفض المخزون"
                )
            }
        }
        .padding()
        .cardStyle()
    }
    
    private func alertRow(icon: String, color: Color, text: String) -> some View {
        HStack {
            Text(text)
                .font(.subheadline)
            Spacer()
            Image(systemName: icon)
                .foregroundColor(color)
        }
        .padding(.vertical, 4)
    }
    
    private func errorView(_ error: String) -> some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundColor(.warningOrange)
            Text(error)
                .multilineTextAlignment(.center)
            Button("إعادة المحاولة") {
                Task { await viewModel.loadStats() }
            }
            .buttonStyle(.borderedProminent)
            .tint(.accentGreen)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        let num = formatter.string(from: NSNumber(value: value)) ?? "0"
        return "\(num) \(appState.currency)"
    }
}

// MARK: - Stat Card

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: AppSpacing.sm) {
            HStack {
                Text(value)
                    .font(.title2.bold())
                    .foregroundColor(color)
                Spacer()
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(color.opacity(0.7))
            }
            
            HStack {
                Spacer()
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .cardStyle()
    }
}

// MARK: - Quick Action Button

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.primary)
            }
            .frame(width: 80, height: 80)
            .background(color.opacity(0.1))
            .cornerRadius(AppCornerRadius.md)
        }
    }
}

// MARK: - ViewModel

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var stats: DashboardStats?
    @Published var isLoading = false
    @Published var error: String?
    
    func loadStats() async {
        isLoading = true
        error = nil
        do {
            stats = try await APIClient.shared.get("/api/stats")
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
