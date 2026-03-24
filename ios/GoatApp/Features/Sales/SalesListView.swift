import SwiftUI

/// قائمة المبيعات
struct SalesListView: View {
    @StateObject private var viewModel = SalesListViewModel()
    @State private var showAddSale = false
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("جاري التحميل...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.sales.isEmpty {
                VStack(spacing: AppSpacing.md) {
                    Image(systemName: "banknote")
                        .font(.system(size: 50))
                        .foregroundColor(.gray.opacity(0.4))
                    Text("لا توجد مبيعات")
                        .foregroundColor(.secondary)
                    Button("إضافة بيع") { showAddSale = true }
                        .buttonStyle(.borderedProminent)
                        .tint(.accentGreen)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(viewModel.sales) { sale in
                    SaleRow(sale: sale)
                }
                .listStyle(.plain)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("المبيعات")
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { showAddSale = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAddSale) {
            SaleFormView {
                Task { await viewModel.loadSales() }
            }
        }
        .refreshable {
            await viewModel.loadSales()
        }
        .task {
            await viewModel.loadSales()
        }
    }
}

// MARK: - Sale Row

struct SaleRow: View {
    let sale: Sale
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        VStack(alignment: .trailing, spacing: AppSpacing.sm) {
            HStack {
                Text(sale.statusAr)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(statusBg)
                    .foregroundColor(statusFg)
                    .cornerRadius(8)
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text(sale.buyerName)
                        .font(.headline)
                    if let goat = sale.goat {
                        Text("رقم: \(goat.tagId)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            HStack {
                // Remaining
                if let remaining = sale.remaining, remaining > 0 {
                    Text("متبقي: \(String(format: "%.0f", remaining))")
                        .font(.caption)
                        .foregroundColor(.dangerRed)
                }
                
                Spacer()
                
                Text("\(String(format: "%.0f", sale.salePrice)) \(appState.currency)")
                    .font(.title3.bold())
                    .foregroundColor(.accentGreen)
            }
            
            Text(sale.date.formatted(.dateTime.day().month().year()))
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
    
    private var statusBg: Color {
        switch sale.statusColor {
        case "green": return .accentGreen.opacity(0.15)
        case "orange": return .warningOrange.opacity(0.15)
        case "red": return .dangerRed.opacity(0.15)
        default: return .gray.opacity(0.15)
        }
    }
    
    private var statusFg: Color {
        switch sale.statusColor {
        case "green": return .accentGreen
        case "orange": return .warningOrange
        case "red": return .dangerRed
        default: return .gray
        }
    }
}

// MARK: - Sale Form

struct SaleFormView: View {
    let onSaved: () -> Void
    @Environment(\.dismiss) var dismiss
    
    @State private var goatId = ""
    @State private var buyerName = ""
    @State private var buyerPhone = ""
    @State private var salePrice = ""
    @State private var paidAmount = ""
    @State private var date = Date()
    @State private var notes = ""
    @State private var goats: [Goat] = []
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section("الرأس") {
                    Picker("اختر رأس", selection: $goatId) {
                        Text("بدون ربط").tag("")
                        ForEach(goats.filter { $0.status == "ACTIVE" }) { goat in
                            Text("\(goat.tagId) - \(goat.displayName)").tag(goat.id)
                        }
                    }
                }
                
                Section("بيانات المشتري") {
                    HStack {
                        TextField("اسم المشتري", text: $buyerName)
                            .multilineTextAlignment(.trailing)
                        Text("المشتري *")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("رقم الجوال", text: $buyerPhone)
                            .keyboardType(.phonePad)
                        Text("الجوال")
                            .foregroundColor(.secondary)
                    }
                }
                
                Section("المبلغ") {
                    HStack {
                        TextField("0", text: $salePrice)
                            .keyboardType(.decimalPad)
                        Text("سعر البيع *")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("0", text: $paidAmount)
                            .keyboardType(.decimalPad)
                        Text("المبلغ المدفوع")
                            .foregroundColor(.secondary)
                    }
                    
                    DatePicker("التاريخ", selection: $date, displayedComponents: .date)
                        .environment(\.locale, Locale(identifier: "ar"))
                }
                
                Section("ملاحظات") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 50)
                        .multilineTextAlignment(.trailing)
                }
            }
            .navigationTitle("إضافة بيع")
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
                    .disabled(buyerName.isEmpty || salePrice.isEmpty || isLoading)
                }
            }
            .alert("خطأ", isPresented: $showError) {
                Button("حسناً", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
            .task {
                do { goats = try await APIClient.shared.get("/api/goats") } catch {}
            }
        }
    }
    
    private func save() {
        isLoading = true
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        let request = SaleCreateRequest(
            goatId: goatId.isEmpty ? nil : goatId,
            date: formatter.string(from: date),
            buyerName: buyerName,
            buyerPhone: buyerPhone.isEmpty ? nil : buyerPhone,
            salePrice: Double(salePrice) ?? 0,
            paidAmount: Double(paidAmount),
            notes: notes.isEmpty ? nil : notes
        )
        
        Task {
            do {
                let _: Sale = try await APIClient.shared.post("/api/sales", body: request)
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
class SalesListViewModel: ObservableObject {
    @Published var sales: [Sale] = []
    @Published var isLoading = false
    
    func loadSales() async {
        isLoading = true
        do {
            sales = try await APIClient.shared.get("/api/sales")
        } catch {}
        isLoading = false
    }
}
