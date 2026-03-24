import SwiftUI

/// قائمة سجلات التزاوج
struct BreedingListView: View {
    @StateObject private var viewModel = BreedingListViewModel()
    @State private var showAddBreeding = false
    @State private var selectedFilter: String? = nil
    
    var body: some View {
        VStack(spacing: 0) {
            // Status filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.sm) {
                    FilterChip(title: "الكل", isSelected: selectedFilter == nil) {
                        selectedFilter = nil
                    }
                    FilterChip(title: "تم التلقيح", isSelected: selectedFilter == "MATED") {
                        selectedFilter = "MATED"
                    }
                    FilterChip(title: "حامل", isSelected: selectedFilter == "PREGNANT") {
                        selectedFilter = "PREGNANT"
                    }
                    FilterChip(title: "ولدت", isSelected: selectedFilter == "DELIVERED") {
                        selectedFilter = "DELIVERED"
                    }
                    FilterChip(title: "فشل", isSelected: selectedFilter == "FAILED") {
                        selectedFilter = "FAILED"
                    }
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
            }
            .background(Color.white)
            
            if viewModel.isLoading {
                ProgressView("جاري التحميل...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredRecords.isEmpty {
                VStack(spacing: AppSpacing.md) {
                    Image(systemName: "heart.circle")
                        .font(.system(size: 50))
                        .foregroundColor(.gray.opacity(0.4))
                    Text("لا توجد سجلات تزاوج")
                        .foregroundColor(.secondary)
                    Button("إضافة تزاوج") { showAddBreeding = true }
                        .buttonStyle(.borderedProminent)
                        .tint(.accentGreen)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(filteredRecords) { record in
                    BreedingRecordRow(record: record)
                }
                .listStyle(.plain)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("التزاوج")
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { showAddBreeding = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAddBreeding) {
            BreedingFormView {
                Task { await viewModel.loadRecords() }
            }
        }
        .refreshable {
            await viewModel.loadRecords()
        }
        .task {
            await viewModel.loadRecords()
        }
    }
    
    private var filteredRecords: [BreedingRecord] {
        guard let filter = selectedFilter else { return viewModel.records }
        return viewModel.records.filter { $0.pregnancyStatus == filter }
    }
}

// MARK: - Breeding Record Row

struct BreedingRecordRow: View {
    let record: BreedingRecord
    
    var body: some View {
        VStack(alignment: .trailing, spacing: AppSpacing.sm) {
            // Header
            HStack {
                // Status badge
                Text(record.statusAr)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(statusBackground)
                    .foregroundColor(statusForeground)
                    .cornerRadius(8)
                
                Spacer()
                
                // Mother info
                HStack(spacing: 4) {
                    Text(record.mother?.displayName ?? "غير محدد")
                        .font(.headline)
                    Image(systemName: "arrow.down.circle.fill")
                        .foregroundColor(.pink)
                }
            }
            
            // Father
            if let father = record.father {
                HStack {
                    Spacer()
                    HStack(spacing: 4) {
                        Text("الأب: \(father.displayName)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Image(systemName: "arrow.up.circle.fill")
                            .foregroundColor(.infoBlue)
                            .font(.caption)
                    }
                }
            }
            
            // Dates
            HStack {
                if let dueDate = record.dueDate {
                    HStack(spacing: 4) {
                        Text("متوقع: \(dueDate.formatted(.dateTime.day().month()))")
                            .font(.caption)
                        Image(systemName: "calendar.badge.clock")
                            .font(.caption)
                    }
                    .foregroundColor(.warningOrange)
                }
                
                Spacer()
                
                Text("تاريخ التلقيح: \(record.matingDate.formatted(.dateTime.day().month().year()))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Births
            if let births = record.births, !births.isEmpty {
                Divider()
                HStack {
                    ForEach(births) { birth in
                        HStack(spacing: 4) {
                            Text(birth.kidTagId)
                            Image(systemName: birth.gender == "MALE" ? "arrow.up" : "arrow.down")
                                .foregroundColor(birth.gender == "MALE" ? .infoBlue : .pink)
                            if let w = birth.weight {
                                Text("\(String(format: "%.1f", w))كغ")
                            }
                        }
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color(.systemGray6))
                        .cornerRadius(6)
                    }
                    
                    Spacer()
                    
                    Text("المواليد (\(births.count))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private var statusBackground: Color {
        switch record.statusColor {
        case "blue": return .infoBlue.opacity(0.15)
        case "orange": return .warningOrange.opacity(0.15)
        case "green": return .accentGreen.opacity(0.15)
        case "red": return .dangerRed.opacity(0.15)
        default: return .gray.opacity(0.15)
        }
    }
    
    private var statusForeground: Color {
        switch record.statusColor {
        case "blue": return .infoBlue
        case "orange": return .warningOrange
        case "green": return .accentGreen
        case "red": return .dangerRed
        default: return .gray
        }
    }
}

// MARK: - Breeding Form

struct BreedingFormView: View {
    let onSaved: () -> Void
    @Environment(\.dismiss) var dismiss
    
    @State private var motherId = ""
    @State private var fatherId = ""
    @State private var matingDate = Date()
    @State private var pregnancyStatus = "MATED"
    @State private var dueDate: Date?
    @State private var showDueDate = false
    @State private var notes = ""
    @State private var isLoading = false
    @State private var goats: [Goat] = []
    @State private var showError = false
    @State private var errorMessage = ""
    
    var females: [Goat] { goats.filter { $0.gender == "FEMALE" && $0.status == "ACTIVE" } }
    var males: [Goat] { goats.filter { $0.gender == "MALE" && $0.status == "ACTIVE" } }
    
    var body: some View {
        NavigationStack {
            Form {
                Section("الأم والأب") {
                    Picker("الأم *", selection: $motherId) {
                        Text("اختر الأم").tag("")
                        ForEach(females) { goat in
                            Text("\(goat.tagId) - \(goat.displayName)").tag(goat.id)
                        }
                    }
                    
                    Picker("الأب", selection: $fatherId) {
                        Text("غير محدد").tag("")
                        ForEach(males) { goat in
                            Text("\(goat.tagId) - \(goat.displayName)").tag(goat.id)
                        }
                    }
                }
                
                Section("التفاصيل") {
                    DatePicker("تاريخ التلقيح", selection: $matingDate, displayedComponents: .date)
                        .environment(\.locale, Locale(identifier: "ar"))
                    
                    Picker("الحالة", selection: $pregnancyStatus) {
                        Text("تم التلقيح").tag("MATED")
                        Text("حامل").tag("PREGNANT")
                    }
                    
                    Toggle("تحديد موعد متوقع", isOn: $showDueDate)
                    if showDueDate {
                        DatePicker("الموعد المتوقع", selection: Binding(
                            get: { dueDate ?? Calendar.current.date(byAdding: .day, value: 150, to: matingDate) ?? Date() },
                            set: { dueDate = $0 }
                        ), displayedComponents: .date)
                        .environment(\.locale, Locale(identifier: "ar"))
                    }
                }
                
                Section("ملاحظات") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 50)
                        .multilineTextAlignment(.trailing)
                }
            }
            .navigationTitle("إضافة تزاوج")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("إلغاء") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: save) {
                        if isLoading { ProgressView() }
                        else { Text("حفظ").bold() }
                    }
                    .disabled(motherId.isEmpty || isLoading)
                }
            }
            .alert("خطأ", isPresented: $showError) {
                Button("حسناً", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
            .task {
                do {
                    goats = try await APIClient.shared.get("/api/goats")
                } catch {}
            }
        }
    }
    
    private func save() {
        isLoading = true
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        let request = BreedingCreateRequest(
            motherId: motherId,
            fatherId: fatherId.isEmpty ? nil : fatherId,
            matingDate: formatter.string(from: matingDate),
            pregnancyStatus: pregnancyStatus,
            dueDate: showDueDate && dueDate != nil ? formatter.string(from: dueDate!) : nil,
            notes: notes.isEmpty ? nil : notes
        )
        
        Task {
            do {
                let _: BreedingRecord = try await APIClient.shared.post("/api/breeding", body: request)
                onSaved()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isLoading = false
        }
    }
}

// MARK: - ViewModel

@MainActor
class BreedingListViewModel: ObservableObject {
    @Published var records: [BreedingRecord] = []
    @Published var isLoading = false
    
    func loadRecords() async {
        isLoading = true
        do {
            records = try await APIClient.shared.get("/api/breeding")
        } catch {}
        isLoading = false
    }
}
