import SwiftUI

/// شاشة تسجيل الدخول
struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var identifier = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var showPassword = false
    @FocusState private var focusedField: Field?
    
    enum Field { case identifier, password }
    
    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.xl) {
                // Logo
                headerSection
                
                // Form
                VStack(spacing: AppSpacing.md) {
                    // Username/Email
                    VStack(alignment: .trailing, spacing: AppSpacing.xs) {
                        Text("اسم المستخدم أو البريد")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        HStack {
                            TextField("أدخل اسم المستخدم أو البريد", text: $identifier)
                                .textContentType(.username)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                                .focused($focusedField, equals: .identifier)
                                .submitLabel(.next)
                                .onSubmit { focusedField = .password }
                            
                            Image(systemName: "person.fill")
                                .foregroundColor(.accentGreen)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(AppCornerRadius.md)
                    }
                    
                    // Password
                    VStack(alignment: .trailing, spacing: AppSpacing.xs) {
                        Text("كلمة المرور")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        HStack {
                            if showPassword {
                                TextField("أدخل كلمة المرور", text: $password)
                            } else {
                                SecureField("أدخل كلمة المرور", text: $password)
                            }
                            
                            Button(action: { showPassword.toggle() }) {
                                Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                                    .foregroundColor(.gray)
                            }
                            
                            Image(systemName: "lock.fill")
                                .foregroundColor(.accentGreen)
                        }
                        .textContentType(.password)
                        .focused($focusedField, equals: .password)
                        .submitLabel(.go)
                        .onSubmit { login() }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(AppCornerRadius.md)
                    }
                }
                .multilineTextAlignment(.trailing)
                
                // Login Button
                Button(action: login) {
                    HStack {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        }
                        Text("تسجيل الدخول")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(isFormValid ? Color.accentGreen : Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(AppCornerRadius.md)
                }
                .disabled(!isFormValid || isLoading)
                
                // Forgot password
                NavigationLink("نسيت كلمة المرور؟") {
                    ForgotPasswordView()
                }
                .font(.subheadline)
                .foregroundColor(.accentGreen)
            }
            .padding(AppSpacing.lg)
        }
        .background(Color(.systemBackground))
        .alert("خطأ", isPresented: $showError) {
            Button("حسناً", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }
    
    private var headerSection: some View {
        VStack(spacing: AppSpacing.md) {
            Spacer().frame(height: 40)
            
            Image(systemName: "pawprint.fill")
                .resizable()
                .scaledToFit()
                .frame(width: 80, height: 80)
                .foregroundColor(.accentGreen)
            
            Text("إدارة المواشي")
                .font(.title.bold())
                .foregroundColor(.darkText)
            
            Text("سجّل دخولك للمتابعة")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }
    
    private var isFormValid: Bool {
        !identifier.trimmingCharacters(in: .whitespaces).isEmpty &&
        !password.isEmpty
    }
    
    private func login() {
        guard isFormValid else { return }
        focusedField = nil
        isLoading = true
        
        Task {
            do {
                try await authManager.login(
                    identifier: identifier.trimmingCharacters(in: .whitespaces),
                    password: password
                )
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isLoading = false
        }
    }
}

// MARK: - Forgot Password

struct ForgotPasswordView: View {
    @State private var email = ""
    @State private var isLoading = false
    @State private var sent = false
    @State private var error: String?
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        VStack(spacing: AppSpacing.lg) {
            if sent {
                VStack(spacing: AppSpacing.md) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.accentGreen)
                    Text("تم إرسال رابط إعادة التعيين")
                        .font(.headline)
                    Text("تحقق من بريدك الإلكتروني")
                        .foregroundColor(.secondary)
                    Button("العودة") { dismiss() }
                        .buttonStyle(.borderedProminent)
                        .tint(.accentGreen)
                }
            } else {
                Text("أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور")
                    .multilineTextAlignment(.center)
                    .foregroundColor(.secondary)
                
                TextField("البريد الإلكتروني", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(AppCornerRadius.md)
                
                if let error {
                    Text(error)
                        .foregroundColor(.dangerRed)
                        .font(.caption)
                }
                
                Button(action: sendReset) {
                    HStack {
                        if isLoading { ProgressView().tint(.white) }
                        Text("إرسال")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(email.isEmpty ? Color.gray : Color.accentGreen)
                    .foregroundColor(.white)
                    .cornerRadius(AppCornerRadius.md)
                }
                .disabled(email.isEmpty || isLoading)
            }
        }
        .padding(AppSpacing.lg)
        .navigationTitle("نسيت كلمة المرور")
    }
    
    private func sendReset() {
        isLoading = true
        error = nil
        Task {
            do {
                let _: SuccessResponse = try await APIClient.shared.post(
                    "/api/auth/forgot-password",
                    body: ["email": email]
                )
                sent = true
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        }
    }
}
