import SwiftUI
import PhotosUI

/// نموذج إضافة/تعديل ماشية
struct GoatFormView: View {
    let mode: GoatFormMode
    let onSaved: () -> Void
    
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = GoatFormViewModel()
    
    // Form fields
    @State private var tagId = ""
    @State private var name = ""
    @State private var gender = "MALE"
    @State private var birthDate = Date()
    @State private var weight = ""
    @State private var color = ""
    @State private var status = "ACTIVE"
    @State private var selectedBreedId = ""
    @State private var selectedPenId = ""
    @State private var notes = ""
    @State private var purchasePrice = ""
    
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationStack {
            Form {
                // Basic Info
                Section("المعلومات الأساسية") {
                    HStack {
                        TextField("مثال: 001", text: $tagId)
                            .multilineTextAlignment(.leading)
                        Text("رقم التعريف *")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("اختياري", text: $name)
                            .multilineTextAlignment(.leading)
                        Text("الاسم")
                            .foregroundColor(.secondary)
                    }
                    
                    Picker("الجنس", selection: $gender) {
                        Text("ذكر").tag("MALE")
                        Text("أنثى").tag("FEMALE")
                    }
                    
                    DatePicker("تاريخ الميلاد", selection: $birthDate, displayedComponents: .date)
                        .environment(\.locale, Locale(identifier: "ar"))
                    
                    Picker("الحالة", selection: $status) {
                        Text("نشط").tag("ACTIVE")
                        Text("مباع").tag("SOLD")
                        Text("نافق").tag("DECEASED")
                        Text("حجر صحي").tag("QUARANTINE")
                        Text("خارجي").tag("EXTERNAL")
                    }
                }
                
                // Details
                Section("التفاصيل") {
                    if !viewModel.breeds.isEmpty {
                        Picker("السلالة", selection: $selectedBreedId) {
                            Text("اختر السلالة").tag("")
                            ForEach(viewModel.breeds, id: \.id) { breed in
                                Text(breed.displayName).tag(breed.id)
                            }
                        }
                    }
                    
                    HStack {
                        TextField("كغ", text: $weight)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.leading)
                        Text("الوزن")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("مثلاً: أبيض", text: $color)
                            .multilineTextAlignment(.leading)
                        Text("اللون")
                            .foregroundColor(.secondary)
                    }
                    
                    if !viewModel.pens.isEmpty {
                        Picker("الحظيرة", selection: $selectedPenId) {
                            Text("بدون حظيرة").tag("")
                            ForEach(viewModel.pens, id: \.id) { pen in
                                Text(pen.displayName).tag(pen.id)
                            }
                        }
                    }
                }
                
                // Purchase
                Section("بيانات الشراء") {
                    HStack {
                        TextField("0", text: $purchasePrice)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.leading)
                        Text("سعر الشراء")
                            .foregroundColor(.secondary)
                    }
                }
                
                // Notes
                Section("ملاحظات") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 60)
                        .multilineTextAlignment(.trailing)
                }
            }
            .navigationTitle(mode.isEdit ? "تعديل الرأس" : "إضافة رأس جديد")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("إلغاء") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: save) {
                        if isLoading {
                            ProgressView()
                        } else {
                            Text("حفظ")
                                .bold()
                        }
                    }
                    .disabled(tagId.isEmpty || selectedBreedId.isEmpty || isLoading)
                }
            }
            .alert("خطأ", isPresented: $showError) {
                Button("حسناً", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
            .task {
                await viewModel.loadFormData()
                if case .edit(let goat) = mode {
                    populateForm(from: goat)
                }
            }
        }
    }
    
    private func populateForm(from goat: Goat) {
        tagId = goat.tagId
        name = goat.name ?? ""
        gender = goat.gender
        birthDate = goat.birthDate ?? Date()
        weight = goat.weight.map { String($0) } ?? ""
        color = goat.color ?? ""
        status = goat.status
        selectedBreedId = goat.breedId ?? ""
        selectedPenId = goat.penId ?? ""
        notes = goat.notes ?? ""
        purchasePrice = goat.purchasePrice.map { String($0) } ?? ""
    }
    
    private func save() {
        isLoading = true
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        var request = GoatCreateRequest(
            tagId: tagId,
            name: name.isEmpty ? nil : name,
            breedId: selectedBreedId,
            gender: gender,
            birthDate: formatter.string(from: birthDate),
            weight: Double(weight),
            color: color.isEmpty ? nil : color,
            status: status,
            penId: selectedPenId.isEmpty ? nil : selectedPenId,
            purchasePrice: Double(purchasePrice),
            notes: notes.isEmpty ? nil : notes
        )
        
        Task {
            do {
                if case .edit(let goat) = mode {
                    let _: Goat = try await APIClient.shared.put("/api/goats/\(goat.id)", body: request)
                } else {
                    let _: Goat = try await APIClient.shared.post("/api/goats", body: request)
                }
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

// MARK: - Form Mode

enum GoatFormMode {
    case create
    case edit(Goat)
    
    var isEdit: Bool {
        if case .edit = self { return true }
        return false
    }
}

// MARK: - ViewModel

@MainActor
class GoatFormViewModel: ObservableObject {
    @Published var breeds: [Breed] = []
    @Published var pens: [Pen] = []
    
    func loadFormData() async {
        async let breedsTask: [Breed] = APIClient.shared.get("/api/breeds")
        async let pensTask: [Pen] = APIClient.shared.get("/api/pens")
        
        do {
            breeds = try await breedsTask
            pens = try await pensTask
        } catch {
            // Silent fail - pickers will be empty
        }
    }
}
