import SwiftUI

/// قائمة الأعلاف
struct FeedsListView: View {
    @StateObject private var viewModel = FeedsListViewModel()
    @State private var selectedCategory: String? = nil
    
    var body: some View {
        VStack(spacing: 0) {
            // Category filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.sm) {
                    FilterChip(title: "الكل", isSelected: selectedCategory == nil) {
                        selectedCategory = nil
                    }
                    ForEach(categories, id: \.0) { cat in
                        FilterChip(title: cat.1, isSelected: selectedCategory == cat.0) {
                            selectedCategory = cat.0
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
            }
            .background(Color.white)
            
            if viewModel.isLoading {
                ProgressView("جاري التحميل...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredFeeds.isEmpty {
                VStack(spacing: AppSpacing.md) {
                    Image(systemName: "leaf")
                        .font(.system(size: 50))
                        .foregroundColor(.gray.opacity(0.4))
                    Text("لا توجد أعلاف")
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(filteredFeeds) { feed in
                    FeedRow(feed: feed)
                }
                .listStyle(.plain)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("الأعلاف")
        .refreshable { await viewModel.loadFeeds() }
        .task { await viewModel.loadFeeds() }
    }
    
    private var filteredFeeds: [FeedType] {
        guard let cat = selectedCategory else { return viewModel.feeds }
        return viewModel.feeds.filter { $0.category == cat }
    }
    
    private let categories: [(String, String)] = [
        ("HAY", "تبن"), ("GRAINS", "حبوب"), ("CONCENTRATE", "مركز"),
        ("SUPPLEMENTS", "مكملات"), ("MINERALS", "معادن"), ("OTHER", "أخرى"),
    ]
}

// MARK: - Feed Row

struct FeedRow: View {
    let feed: FeedType
    
    var body: some View {
        VStack(alignment: .trailing, spacing: AppSpacing.sm) {
            HStack {
                // Stock indicator
                HStack(spacing: 4) {
                    Circle()
                        .fill(stockColor)
                        .frame(width: 8, height: 8)
                    Text("\(String(format: "%.0f", feed.totalStock))")
                        .font(.subheadline.bold())
                        .foregroundColor(stockColor)
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text(feed.displayName)
                        .font(.headline)
                    Text(feed.categoryAr)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            HStack {
                if let price = feed.unitPrice {
                    Label("\(String(format: "%.0f", price))/وحدة", systemImage: "tag")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if let schedules = feed.schedules, !schedules.isEmpty {
                    HStack(spacing: 4) {
                        Text("\(schedules.filter { $0.isActive == true }.count) جدول نشط")
                        Image(systemName: "calendar")
                    }
                    .font(.caption)
                    .foregroundColor(.accentGreen)
                }
            }
            
            // Low stock warning
            if let reorder = feed.reorderLevel, feed.totalStock < reorder {
                HStack {
                    Spacer()
                    HStack(spacing: 4) {
                        Text("مخزون منخفض!")
                        Image(systemName: "exclamationmark.triangle.fill")
                    }
                    .font(.caption)
                    .foregroundColor(.warningOrange)
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private var stockColor: Color {
        if let reorder = feed.reorderLevel, feed.totalStock < reorder {
            return .dangerRed
        }
        return feed.totalStock > 0 ? .accentGreen : .gray
    }
}

// MARK: - ViewModel

@MainActor
class FeedsListViewModel: ObservableObject {
    @Published var feeds: [FeedType] = []
    @Published var isLoading = false
    
    func loadFeeds() async {
        isLoading = true
        do {
            feeds = try await APIClient.shared.get("/api/feeds")
        } catch {}
        isLoading = false
    }
}
