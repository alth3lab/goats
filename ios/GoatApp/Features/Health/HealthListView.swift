import SwiftUI

/// قائمة السجلات الصحية
struct HealthListView: View {
    var goatId: String? = nil
    @StateObject private var viewModel = HealthListViewModel()
    @State private var showAddRecord = false
    @State private var selectedType: String? = nil
    
    var body: some View {
        VStack(spacing: 0) {
            // Type filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.sm) {
                    FilterChip(title: "الكل", isSelected: selectedType == nil) {
                        selectedType = nil
                    }
                    ForEach(healthTypes, id: \.0) { type in
                        FilterChip(title: type.1, isSelected: selectedType == type.0) {
                            selectedType = type.0
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
            } else if filteredRecords.isEmpty {
                VStack(spacing: AppSpacing.md) {
                    Image(systemName: "heart.text.square")
                        .font(.system(size: 50))
                        .foregroundColor(.gray.opacity(0.4))
                    Text("لا توجد سجلات صحية")
                        .foregroundColor(.secondary)
                    Button("إضافة سجل") { showAddRecord = true }
                        .buttonStyle(.borderedProminent)
                        .tint(.accentGreen)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(filteredRecords) { record in
                    HealthRecordRow(record: record)
                }
                .listStyle(.plain)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("السجلات الصحية")
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { showAddRecord = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAddRecord) {
            HealthFormView(goatId: goatId) {
                Task { await viewModel.loadRecords(goatId: goatId) }
            }
        }
        .refreshable {
            await viewModel.loadRecords(goatId: goatId)
        }
        .task {
            await viewModel.loadRecords(goatId: goatId)
        }
    }
    
    private var filteredRecords: [HealthRecord] {
        guard let type = selectedType else { return viewModel.records }
        return viewModel.records.filter { $0.type == type }
    }
    
    private let healthTypes: [(String, String)] = [
        ("VACCINATION", "تطعيم"),
        ("DEWORMING", "تطفيل"),
        ("TREATMENT", "علاج"),
        ("CHECKUP", "فحص"),
        ("SURGERY", "عملية"),
    ]
}

// MARK: - Health Record Row

struct HealthRecordRow: View {
    let record: HealthRecord
    
    var body: some View {
        HStack(spacing: AppSpacing.md) {
            // Icon
            Image(systemName: record.typeIcon)
                .font(.title3)
                .foregroundColor(.white)
                .frame(width: 44, height: 44)
                .background(Color.accentGreen)
                .cornerRadius(AppCornerRadius.sm)
            
            // Info
            VStack(alignment: .trailing, spacing: 4) {
                HStack {
                    if let cost = record.cost {
                        Text("\(String(format: "%.0f", cost))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Text(record.description)
                        .font(.headline)
                }
                
                HStack {
                    Text(record.date.formatted(.dateTime.day().month().year()))
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    Text(record.typeAr)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.surfaceGreen)
                        .cornerRadius(4)
                }
                
                if let goat = record.goat {
                    Text("رقم: \(goat.tagId)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if let vet = record.veterinarian, !vet.isEmpty {
                    Text("بيطري: \(vet)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                if let nextDue = record.nextDueDate {
                    HStack(spacing: 4) {
                        Text("الموعد القادم: \(nextDue.formatted(.dateTime.day().month()))")
                            .font(.caption2)
                        Image(systemName: "bell.fill")
                            .font(.caption2)
                    }
                    .foregroundColor(.warningOrange)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Health Form

struct HealthFormView: View {
    var goatId: String?
    let onSaved: () -> Void
    
    @Environment(\.dismiss) var dismiss
    @State private var selectedGoatId = ""
    @State private var type = "VACCINATION"
    @State private var date = Date()
    @State private var description = ""
    @State private var veterinarian = ""
    @State private var medication = ""
    @State private var cost = ""
    @State private var nextDueDate: Date?
    @State private var notes = ""
    @State private var showNextDue = false
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section("نوع السجل") {
                    Picker("النوع", selection: $type) {
                        Text("تطعيم").tag("VACCINATION")
                        Text("تطفيل").tag("DEWORMING")
                        Text("علاج").tag("TREATMENT")
                        Text("فحص").tag("CHECKUP")
                        Text("عملية").tag("SURGERY")
                    }
                    .pickerStyle(.segmented)
                }
                
                Section("التفاصيل") {
                    DatePicker("التاريخ", selection: $date, displayedComponents: .date)
                        .environment(\.locale, Locale(identifier: "ar"))
                    
                    HStack {
                        TextField("وصف السجل الصحي", text: $description)
                            .multilineTextAlignment(.trailing)
                        Text("الوصف *")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("اسم البيطري", text: $veterinarian)
                            .multilineTextAlignment(.trailing)
                        Text("البيطري")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("اسم الدواء", text: $medication)
                            .multilineTextAlignment(.trailing)
                        Text("الدواء")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("0", text: $cost)
                            .keyboardType(.decimalPad)
                        Text("التكلفة")
                            .foregroundColor(.secondary)
                    }
                }
                
                Section("الموعد القادم") {
                    Toggle("تحديد موعد قادم", isOn: $showNextDue)
                    
                    if showNextDue {
                        DatePicker("الموعد", selection: Binding(
                            get: { nextDueDate ?? Date() },
                            set: { nextDueDate = $0 }
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
            .navigationTitle("إضافة سجل صحي")
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
                    .disabled(description.isEmpty || isLoading)
                }
            }
            .alert("خطأ", isPresented: $showError) {
                Button("حسناً", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
            .onAppear {
                if let goatId { selectedGoatId = goatId }
            }
        }
    }
    
    private func save() {
        guard !description.isEmpty else { return }
        isLoading = true
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        let request = HealthCreateRequest(
            goatId: goatId ?? selectedGoatId,
            type: type,
            date: formatter.string(from: date),
            description: description,
            veterinarian: veterinarian.isEmpty ? nil : veterinarian,
            medication: medication.isEmpty ? nil : medication,
            cost: Double(cost),
            nextDueDate: showNextDue && nextDueDate != nil ? formatter.string(from: nextDueDate!) : nil,
            notes: notes.isEmpty ? nil : notes
        )
        
        Task {
            do {
                let _: HealthRecord = try await APIClient.shared.post("/api/health", body: request)
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
class HealthListViewModel: ObservableObject {
    @Published var records: [HealthRecord] = []
    @Published var isLoading = false
    
    func loadRecords(goatId: String? = nil) async {
        isLoading = true
        do {
            var query: [String: String]? = nil
            if let goatId { query = ["goatId": goatId] }
            records = try await APIClient.shared.get("/api/health", query: query)
        } catch {
            // Handle error
        }
        isLoading = false
    }
}
