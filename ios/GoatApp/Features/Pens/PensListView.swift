import SwiftUI

/// قائمة الحظائر
struct PensListView: View {
    @StateObject private var viewModel = PensListViewModel()
    @State private var showAddPen = false
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("جاري التحميل...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.pens.isEmpty {
                VStack(spacing: AppSpacing.md) {
                    Image(systemName: "square.grid.2x2")
                        .font(.system(size: 50))
                        .foregroundColor(.gray.opacity(0.4))
                    Text("لا توجد حظائر")
                        .foregroundColor(.secondary)
                    Button("إضافة حظيرة") { showAddPen = true }
                        .buttonStyle(.borderedProminent)
                        .tint(.accentGreen)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppSpacing.md) {
                        ForEach(viewModel.pens) { pen in
                            PenCard(pen: pen)
                        }
                    }
                    .padding(AppSpacing.md)
                }
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("الحظائر")
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { showAddPen = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAddPen) {
            PenFormView {
                Task { await viewModel.loadPens() }
            }
        }
        .refreshable { await viewModel.loadPens() }
        .task { await viewModel.loadPens() }
    }
}

// MARK: - Pen Card

struct PenCard: View {
    let pen: Pen
    
    var body: some View {
        VStack(alignment: .trailing, spacing: AppSpacing.sm) {
            HStack {
                // Occupancy indicator
                if let capacity = pen.capacity, capacity > 0 {
                    let count = pen.currentCount ?? pen._count?.goats ?? 0
                    let ratio = Double(count) / Double(capacity)
                    Circle()
                        .fill(ratio > 0.9 ? Color.dangerRed : ratio > 0.7 ? Color.warningOrange : Color.accentGreen)
                        .frame(width: 10, height: 10)
                }
                
                Spacer()
                
                Image(systemName: pen.type == "ISOLATION" ? "exclamationmark.shield" : "square.grid.2x2")
                    .font(.title2)
                    .foregroundColor(.accentGreen)
            }
            
            Text(pen.displayName)
                .font(.headline)
                .multilineTextAlignment(.trailing)
            
            // Count / Capacity
            HStack {
                Spacer()
                let count = pen.currentCount ?? pen._count?.goats ?? 0
                if let capacity = pen.capacity {
                    Text("\(count)/\(capacity)")
                        .font(.subheadline.bold())
                        .foregroundColor(.accentGreen)
                } else {
                    Text("\(count) رأس")
                        .font(.subheadline.bold())
                        .foregroundColor(.accentGreen)
                }
            }
            
            if pen.type == "ISOLATION" {
                Text("عزل")
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.warningOrange.opacity(0.15))
                    .foregroundColor(.warningOrange)
                    .cornerRadius(4)
            }
        }
        .padding()
        .cardStyle()
    }
}

// MARK: - Pen Form

struct PenFormView: View {
    let onSaved: () -> Void
    @Environment(\.dismiss) var dismiss
    
    @State private var nameAr = ""
    @State private var capacity = ""
    @State private var type = ""
    @State private var notes = ""
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section("المعلومات") {
                    HStack {
                        TextField("اسم الحظيرة", text: $nameAr)
                            .multilineTextAlignment(.trailing)
                        Text("الاسم *")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        TextField("0", text: $capacity)
                            .keyboardType(.numberPad)
                        Text("السعة")
                            .foregroundColor(.secondary)
                    }
                    Picker("النوع", selection: $type) {
                        Text("عادي").tag("")
                        Text("عزل").tag("ISOLATION")
                    }
                }
                Section("ملاحظات") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 50)
                        .multilineTextAlignment(.trailing)
                }
            }
            .navigationTitle("إضافة حظيرة")
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
                    .disabled(nameAr.isEmpty || isLoading)
                }
            }
            .alert("خطأ", isPresented: $showError) {
                Button("حسناً", role: .cancel) {}
            } message: { Text(errorMessage) }
        }
    }
    
    private func save() {
        isLoading = true
        let request = PenCreateRequest(
            nameAr: nameAr,
            capacity: Int(capacity),
            type: type.isEmpty ? nil : type,
            notes: notes.isEmpty ? nil : notes
        )
        Task {
            do {
                let _: Pen = try await APIClient.shared.post("/api/pens", body: request)
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
class PensListViewModel: ObservableObject {
    @Published var pens: [Pen] = []
    @Published var isLoading = false
    
    func loadPens() async {
        isLoading = true
        do { pens = try await APIClient.shared.get("/api/pens") } catch {}
        isLoading = false
    }
}
