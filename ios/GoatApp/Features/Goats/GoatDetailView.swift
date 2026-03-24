import SwiftUI

/// تفاصيل الماشية
struct GoatDetailView: View {
    let goatId: String
    @StateObject private var viewModel = GoatDetailViewModel()
    @State private var showEditSheet = false
    @State private var showDeleteAlert = false
    @State private var showImagePicker = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("جاري التحميل...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let goat = viewModel.goat {
                goatContent(goat)
            } else if let error = viewModel.error {
                VStack(spacing: 16) {
                    Text(error)
                    Button("إعادة المحاولة") {
                        Task { await viewModel.loadGoat(id: goatId) }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.accentGreen)
                }
            }
        }
        .navigationTitle(viewModel.goat?.displayName ?? "تفاصيل الرأس")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Menu {
                    Button(action: { showEditSheet = true }) {
                        Label("تعديل", systemImage: "pencil")
                    }
                    Button(role: .destructive, action: { showDeleteAlert = true }) {
                        Label("حذف", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(isPresented: $showEditSheet) {
            if let goat = viewModel.goat {
                GoatFormView(mode: .edit(goat)) {
                    Task { await viewModel.loadGoat(id: goatId) }
                }
            }
        }
        .alert("حذف الرأس", isPresented: $showDeleteAlert) {
            Button("حذف", role: .destructive) { deleteGoat() }
            Button("إلغاء", role: .cancel) {}
        } message: {
            Text("هل أنت متأكد من حذف هذا الرأس؟ لا يمكن التراجع عن هذا الإجراء.")
        }
        .refreshable {
            await viewModel.loadGoat(id: goatId)
        }
        .task {
            await viewModel.loadGoat(id: goatId)
        }
    }
    
    // MARK: - Content
    
    @ViewBuilder
    private func goatContent(_ goat: Goat) -> some View {
        ScrollView {
            VStack(spacing: AppSpacing.md) {
                // Image header
                imageHeader(goat)
                
                // Basic Info
                infoSection(goat)
                
                // Breed & Pen
                detailsSection(goat)
                
                // Parents
                if goat.motherId != nil || goat.fatherId != nil {
                    parentsSection(goat)
                }
                
                // Health Records
                if let records = goat.healthRecords, !records.isEmpty {
                    healthSection(records)
                }
                
                // Sales
                if let sales = goat.sales, !sales.isEmpty {
                    salesSection(sales)
                }
            }
            .padding(AppSpacing.md)
        }
        .background(Color(.systemGroupedBackground))
    }
    
    // MARK: - Image Header
    
    private func imageHeader(_ goat: Goat) -> some View {
        ZStack(alignment: .bottomTrailing) {
            if let imageStr = goat.image ?? goat.thumbnail,
               imageStr.contains("base64,"),
               let base64 = imageStr.components(separatedBy: "base64,").last,
               let data = Data(base64Encoded: base64),
               let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity, maxHeight: 250)
                    .clipped()
                    .cornerRadius(AppCornerRadius.lg)
            } else {
                RoundedRectangle(cornerRadius: AppCornerRadius.lg)
                    .fill(Color.surfaceGreen)
                    .frame(height: 200)
                    .overlay {
                        VStack {
                            Image(systemName: "pawprint.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.accentGreen.opacity(0.3))
                            Text("لا توجد صورة")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
            }
            
            // Camera button
            Button(action: { showImagePicker = true }) {
                Image(systemName: "camera.fill")
                    .padding(10)
                    .background(Color.accentGreen)
                    .foregroundColor(.white)
                    .clipShape(Circle())
            }
            .padding(AppSpacing.md)
        }
    }
    
    // MARK: - Info Section
    
    private func infoSection(_ goat: Goat) -> some View {
        VStack(spacing: AppSpacing.sm) {
            HStack {
                // Status
                Text(goat.statusAr)
                    .font(.caption)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.accentGreen.opacity(0.15))
                    .foregroundColor(.accentGreen)
                    .cornerRadius(8)
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text(goat.displayName)
                        .font(.title2.bold())
                    Text("رقم: \(goat.tagId)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            
            Divider()
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                DetailRow(label: "الجنس", value: goat.genderAr, icon: "person.fill")
                DetailRow(label: "العمر", value: goat.age?.displayAge ?? "-", icon: "calendar")
                DetailRow(label: "الوزن", value: goat.weight.map { "\(String(format: "%.1f", $0)) كغ" } ?? "-", icon: "scalemass")
                DetailRow(label: "اللون", value: goat.color ?? "-", icon: "paintpalette")
            }
        }
        .padding()
        .cardStyle()
    }
    
    // MARK: - Details Section
    
    private func detailsSection(_ goat: Goat) -> some View {
        VStack(alignment: .trailing, spacing: AppSpacing.sm) {
            Text("تفاصيل")
                .font(.headline)
            
            if let breed = goat.breed {
                InfoRow(title: "السلالة", value: breed.displayName)
            }
            if let type = goat.breed?.type {
                InfoRow(title: "النوع", value: type.displayName)
            }
            if let pen = goat.pen {
                InfoRow(title: "الحظيرة", value: pen.displayName)
            }
            if let owner = goat.owner {
                InfoRow(title: "المالك", value: owner.name)
            }
            if let notes = goat.notes, !notes.isEmpty {
                InfoRow(title: "ملاحظات", value: notes)
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding()
        .cardStyle()
    }
    
    // MARK: - Parents Section
    
    private func parentsSection(_ goat: Goat) -> some View {
        VStack(alignment: .trailing, spacing: AppSpacing.sm) {
            Text("الأبوين")
                .font(.headline)
            
            if let motherTag = goat.motherTagId {
                InfoRow(title: "الأم", value: motherTag)
            }
            if let fatherTag = goat.fatherTagId {
                InfoRow(title: "الأب", value: fatherTag)
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding()
        .cardStyle()
    }
    
    // MARK: - Health Section
    
    private func healthSection(_ records: [HealthRecord]) -> some View {
        VStack(alignment: .trailing, spacing: AppSpacing.sm) {
            HStack {
                NavigationLink("عرض الكل") {
                    HealthListView(goatId: goatId)
                }
                .font(.caption)
                Spacer()
                Text("السجلات الصحية")
                    .font(.headline)
            }
            
            ForEach(records.prefix(3)) { record in
                HStack {
                    Text(record.date.formatted(.dateTime.day().month().year()))
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    HStack(spacing: 4) {
                        Text(record.description)
                            .font(.subheadline)
                        Image(systemName: record.typeIcon)
                            .foregroundColor(.accentGreen)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding()
        .cardStyle()
    }
    
    // MARK: - Sales Section
    
    private func salesSection(_ sales: [Sale]) -> some View {
        VStack(alignment: .trailing, spacing: AppSpacing.sm) {
            Text("المبيعات")
                .font(.headline)
            
            ForEach(sales) { sale in
                HStack {
                    Text(sale.statusAr)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(String(format: "%.0f", sale.salePrice)) - \(sale.buyerName)")
                        .font(.subheadline)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding()
        .cardStyle()
    }
    
    // MARK: - Actions
    
    private func deleteGoat() {
        Task {
            do {
                try await APIClient.shared.delete("/api/goats/\(goatId)")
                dismiss()
            } catch {
                viewModel.error = error.localizedDescription
            }
        }
    }
}

// MARK: - Helper Views

struct DetailRow: View {
    let label: String
    let value: String
    let icon: String
    
    var body: some View {
        HStack {
            Text(value)
                .font(.subheadline)
            Spacer()
            HStack(spacing: 4) {
                Text(label)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundColor(.accentGreen)
            }
        }
    }
}

struct InfoRow: View {
    let title: String
    let value: String
    
    var body: some View {
        HStack {
            Text(value)
                .font(.subheadline)
            Spacer()
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 2)
    }
}

// MARK: - ViewModel

@MainActor
class GoatDetailViewModel: ObservableObject {
    @Published var goat: Goat?
    @Published var isLoading = false
    @Published var error: String?
    
    func loadGoat(id: String) async {
        isLoading = true
        error = nil
        do {
            goat = try await APIClient.shared.get("/api/goats/\(id)")
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Goat extension for healthRecords/sales from detail
extension Goat {
    var healthRecords: [HealthRecord]? { nil }  // populated from detail endpoint
    var sales: [Sale]? { nil }
    var motherTagId_display: String? { motherTagId }
    var fatherTagId_display: String? { fatherTagId }
}
