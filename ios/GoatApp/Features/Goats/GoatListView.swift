import SwiftUI

/// قائمة المواشي
struct GoatListView: View {
    @StateObject private var viewModel = GoatListViewModel()
    @State private var searchText = ""
    @State private var selectedFilter: GoatFilter = .all
    @State private var showAddGoat = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Filter chips
            filterBar
            
            // Content
            if viewModel.isLoading && viewModel.goats.isEmpty {
                ProgressView("جاري التحميل...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredGoats.isEmpty {
                emptyState
            } else {
                goatList
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("المواشي")
        .searchable(text: $searchText, prompt: "ابحث بالرقم أو الاسم...")
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { showAddGoat = true }) {
                    Image(systemName: "plus")
                }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button("الكل") { selectedFilter = .all }
                    Button("نشط") { selectedFilter = .active }
                    Button("ذكور") { selectedFilter = .male }
                    Button("إناث") { selectedFilter = .female }
                    Button("حوامل") { selectedFilter = .pregnant }
                } label: {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                }
            }
        }
        .sheet(isPresented: $showAddGoat) {
            GoatFormView(mode: .create) {
                Task { await viewModel.loadGoats() }
            }
        }
        .refreshable {
            await viewModel.loadGoats()
        }
        .task {
            await viewModel.loadGoats()
        }
    }
    
    // MARK: - Filter Bar
    
    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.sm) {
                ForEach(GoatFilter.allCases, id: \.self) { filter in
                    FilterChip(
                        title: filter.label,
                        isSelected: selectedFilter == filter,
                        count: countFor(filter)
                    ) {
                        selectedFilter = filter
                    }
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.sm)
        }
        .background(Color.white)
    }
    
    // MARK: - List
    
    private var goatList: some View {
        List {
            ForEach(filteredGoats) { goat in
                NavigationLink(destination: GoatDetailView(goatId: goat.id)) {
                    GoatRowView(goat: goat)
                }
            }
        }
        .listStyle(.plain)
    }
    
    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "pawprint")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.4))
            Text("لا توجد مواشي")
                .font(.headline)
                .foregroundColor(.secondary)
            Button("إضافة رأس جديد") { showAddGoat = true }
                .buttonStyle(.borderedProminent)
                .tint(.accentGreen)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Helpers
    
    private var filteredGoats: [Goat] {
        var result = viewModel.goats
        
        // Apply filter
        switch selectedFilter {
        case .all: break
        case .active: result = result.filter { $0.status == "ACTIVE" }
        case .male: result = result.filter { $0.gender == "MALE" }
        case .female: result = result.filter { $0.gender == "FEMALE" }
        case .pregnant: result = result.filter { $0.pregnancyStatus == "PREGNANT" }
        case .sold: result = result.filter { $0.status == "SOLD" }
        }
        
        // Apply search
        if !searchText.isEmpty {
            result = result.filter {
                $0.tagId.localizedCaseInsensitiveContains(searchText) ||
                ($0.name?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
        
        return result
    }
    
    private func countFor(_ filter: GoatFilter) -> Int {
        switch filter {
        case .all: return viewModel.goats.count
        case .active: return viewModel.goats.filter { $0.status == "ACTIVE" }.count
        case .male: return viewModel.goats.filter { $0.gender == "MALE" }.count
        case .female: return viewModel.goats.filter { $0.gender == "FEMALE" }.count
        case .pregnant: return viewModel.goats.filter { $0.pregnancyStatus == "PREGNANT" }.count
        case .sold: return viewModel.goats.filter { $0.status == "SOLD" }.count
        }
    }
}

// MARK: - Filter Enum

enum GoatFilter: CaseIterable {
    case all, active, male, female, pregnant, sold
    
    var label: String {
        switch self {
        case .all: return "الكل"
        case .active: return "نشط"
        case .male: return "ذكور"
        case .female: return "إناث"
        case .pregnant: return "حوامل"
        case .sold: return "مباع"
        }
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    var count: Int = 0
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.subheadline)
                if count > 0 {
                    Text("\(count)")
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.3) : Color.gray.opacity(0.2))
                        .cornerRadius(8)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.accentGreen : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
    }
}

// MARK: - Goat Row

struct GoatRowView: View {
    let goat: Goat
    
    var body: some View {
        HStack(spacing: AppSpacing.md) {
            // Thumbnail
            goatImage
            
            // Info
            VStack(alignment: .trailing, spacing: 4) {
                HStack {
                    // Status badge
                    Text(goat.statusAr)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(statusBackground)
                        .cornerRadius(4)
                    
                    Spacer()
                    
                    Text(goat.displayName)
                        .font(.headline)
                }
                
                HStack {
                    if let age = goat.age {
                        Text(age.displayAge)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Text("\(goat.tagId) • \(goat.genderAr)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    if let weight = goat.weight {
                        Label("\(String(format: "%.1f", weight)) كغ", systemImage: "scalemass")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    if let breed = goat.breed {
                        Text(breed.displayName)
                            .font(.caption)
                            .foregroundColor(.accentGreen)
                    }
                }
                
                // Pregnancy status
                if let pregStatus = goat.pregnancyStatus, pregStatus == "PREGNANT" {
                    HStack {
                        if let dueDate = goat.dueDate {
                            Text("موعد الولادة: \(dueDate.formatted(.dateTime.day().month()))")
                                .font(.caption2)
                        }
                        Image(systemName: "heart.fill")
                            .font(.caption2)
                    }
                    .foregroundColor(.warningOrange)
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private var goatImage: some View {
        Group {
            if let imageData = goat.thumbnailImage, let uiImage = UIImage(data: imageData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
            } else {
                Image(systemName: "pawprint.fill")
                    .font(.title2)
                    .foregroundColor(.accentGreen.opacity(0.5))
            }
        }
        .frame(width: 60, height: 60)
        .background(Color.surfaceGreen)
        .cornerRadius(AppCornerRadius.sm)
        .clipped()
    }
    
    private var statusBackground: Color {
        switch goat.statusColor {
        case "green": return .accentGreen.opacity(0.15)
        case "blue": return .infoBlue.opacity(0.15)
        case "red": return .dangerRed.opacity(0.15)
        case "orange": return .warningOrange.opacity(0.15)
        default: return .gray.opacity(0.15)
        }
    }
}

// MARK: - ViewModel

@MainActor
class GoatListViewModel: ObservableObject {
    @Published var goats: [Goat] = []
    @Published var isLoading = false
    @Published var error: String?
    
    func loadGoats() async {
        isLoading = true
        do {
            goats = try await APIClient.shared.get("/api/goats")
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
