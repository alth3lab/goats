import SwiftUI

/// اختيار المزرعة
struct FarmPickerView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) var dismiss
    @State private var isLoading = false
    
    var body: some View {
        NavigationStack {
            List(appState.farms) { farm in
                Button(action: { switchTo(farm) }) {
                    HStack {
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(farm.displayName)
                                .font(.headline)
                            
                            HStack(spacing: 8) {
                                Text(farmTypeLabel(farm.farmType ?? "SHEEP"))
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(Color.surfaceGreen)
                                    .cornerRadius(4)
                                
                                if let tenantName = farm.tenantName {
                                    Text(tenantName)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        
                        Spacer()
                        
                        if farm.id == appState.currentFarm?.id {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.accentGreen)
                        }
                        
                        Image(systemName: farmTypeIcon(farm.farmType ?? "SHEEP"))
                            .font(.title3)
                            .foregroundColor(.accentGreen)
                    }
                }
                .foregroundColor(.primary)
            }
            .navigationTitle("اختر مزرعة")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("إغلاق") { dismiss() }
                }
            }
            .overlay {
                if isLoading {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                    ProgressView("جاري التبديل...")
                        .padding()
                        .background(Color.white)
                        .cornerRadius(AppCornerRadius.md)
                }
            }
        }
    }
    
    private func switchTo(_ farm: FarmListItem) {
        guard farm.id != appState.currentFarm?.id else {
            dismiss()
            return
        }
        isLoading = true
        Task {
            do {
                try await appState.switchFarm(to: farm.id)
                dismiss()
            } catch {
                // TODO: show error
            }
            isLoading = false
        }
    }
    
    private func farmTypeLabel(_ type: String) -> String {
        switch type {
        case "GOAT": return "ماعز"
        case "SHEEP": return "أغنام"
        case "CAMEL": return "إبل"
        case "MIXED": return "مختلط"
        default: return type
        }
    }
    
    private func farmTypeIcon(_ type: String) -> String {
        switch type {
        case "CAMEL": return "tortoise.fill"
        default: return "pawprint.fill"
        }
    }
}
