import SwiftUI

/// شاشة البداية (Splash)
struct SplashView: View {
    @State private var scale = 0.8
    @State private var opacity = 0.5
    
    var body: some View {
        ZStack {
            Color.accentGreen.ignoresSafeArea()
            
            VStack(spacing: 20) {
                Image(systemName: "pawprint.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 100, height: 100)
                    .foregroundColor(.white)
                    .scaleEffect(scale)
                
                Text("إدارة المواشي")
                    .font(.largeTitle.bold())
                    .foregroundColor(.white)
                
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.2)
            }
            .opacity(opacity)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.8)) {
                scale = 1.0
                opacity = 1.0
            }
        }
    }
}
