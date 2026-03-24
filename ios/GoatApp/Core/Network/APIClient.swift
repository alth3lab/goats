import Foundation

/// عميل HTTP مركزي - يدير كل الاتصالات مع الـ API
actor APIClient {
    static let shared = APIClient()
    
    #if DEBUG
    private let baseURL = "http://localhost:3000"
    #else
    private let baseURL = "https://your-production-url.com" // TODO: غيّر هذا للإنتاج
    #endif
    
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        config.httpAdditionalHeaders = [
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Language": "ar",
        ]
        self.session = URLSession(configuration: config)
        
        self.decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let str = try container.decode(String.self)
            
            // Try ISO8601 with fractional seconds
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = iso.date(from: str) { return date }
            
            // Try without fractional seconds
            iso.formatOptions = [.withInternetDateTime]
            if let date = iso.date(from: str) { return date }
            
            // Try date-only
            let df = DateFormatter()
            df.dateFormat = "yyyy-MM-dd"
            if let date = df.date(from: str) { return date }
            
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode date: \(str)")
        }
        
        self.encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
    }
    
    // MARK: - HTTP Methods
    
    func get<T: Decodable>(_ path: String, query: [String: String]? = nil) async throws -> T {
        let request = try buildRequest(path: path, method: "GET", query: query)
        return try await execute(request)
    }
    
    func post<T: Decodable>(_ path: String, body: Any? = nil) async throws -> T {
        let request = try buildRequest(path: path, method: "POST", body: body)
        return try await execute(request)
    }
    
    func put<T: Decodable>(_ path: String, body: Any? = nil) async throws -> T {
        let request = try buildRequest(path: path, method: "PUT", body: body)
        return try await execute(request)
    }
    
    func patch<T: Decodable>(_ path: String, body: Any? = nil) async throws -> T {
        let request = try buildRequest(path: path, method: "PATCH", body: body)
        return try await execute(request)
    }
    
    func delete<T: Decodable>(_ path: String, body: Any? = nil) async throws -> T {
        let request = try buildRequest(path: path, method: "DELETE", body: body)
        return try await execute(request)
    }
    
    /// DELETE بدون استجابة
    func delete(_ path: String) async throws {
        let request = try buildRequest(path: path, method: "DELETE")
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        if http.statusCode >= 400 {
            throw APIError.httpError(statusCode: http.statusCode, message: nil)
        }
    }
    
    // MARK: - Image Upload
    
    func uploadImage(_ path: String, imageData: Data, thumbnailData: Data) async throws -> SuccessResponse {
        let base64Image = "data:image/jpeg;base64," + imageData.base64EncodedString()
        let base64Thumb = "data:image/jpeg;base64," + thumbnailData.base64EncodedString()
        let body: [String: String] = ["image": base64Image, "thumbnail": base64Thumb]
        let request = try buildRequest(path: path, method: "POST", body: body)
        return try await execute(request)
    }
    
    // MARK: - Private
    
    private func buildRequest(path: String, method: String, query: [String: String]? = nil, body: Any? = nil) throws -> URLRequest {
        var components = URLComponents(string: baseURL + path)!
        if let query {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        
        guard let url = components.url else {
            throw APIError.invalidURL(path)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        
        // Add auth token
        if let token = KeychainHelper.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // Encode body
        if let body {
            if let encodable = body as? Encodable {
                request.httpBody = try encoder.encode(AnyEncodable(encodable))
            } else {
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
            }
        }
        
        return request
    }
    
    private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)
        
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        // Handle auth errors
        if http.statusCode == 401 {
            // Try to refresh token
            if let refreshed = try? await refreshToken() {
                KeychainHelper.saveToken(refreshed)
                var retryRequest = request
                retryRequest.setValue("Bearer \(refreshed)", forHTTPHeaderField: "Authorization")
                let (retryData, retryResponse) = try await session.data(for: retryRequest)
                guard let retryHttp = retryResponse as? HTTPURLResponse else {
                    throw APIError.invalidResponse
                }
                if retryHttp.statusCode == 401 {
                    await MainActor.run { AuthManager.shared.logout() }
                    throw APIError.unauthorized
                }
                return try decoder.decode(T.self, from: retryData)
            } else {
                await MainActor.run { AuthManager.shared.logout() }
                throw APIError.unauthorized
            }
        }
        
        if http.statusCode >= 400 {
            if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                throw APIError.httpError(statusCode: http.statusCode, message: errorResponse.error)
            }
            throw APIError.httpError(statusCode: http.statusCode, message: nil)
        }
        
        return try decoder.decode(T.self, from: data)
    }
    
    private func refreshToken() async throws -> String? {
        guard let currentToken = KeychainHelper.getToken() else { return nil }
        
        var request = URLRequest(url: URL(string: baseURL + "/api/auth/refresh")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(currentToken)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            return nil
        }
        
        let refreshResponse = try decoder.decode(TokenRefreshResponse.self, from: data)
        return refreshResponse.token
    }
}

// MARK: - Errors

enum APIError: LocalizedError {
    case invalidURL(String)
    case invalidResponse
    case unauthorized
    case httpError(statusCode: Int, message: String?)
    case decodingError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL(let url): return "رابط غير صحيح: \(url)"
        case .invalidResponse: return "استجابة غير صالحة من الخادم"
        case .unauthorized: return "انتهت صلاحية الجلسة"
        case .httpError(_, let message): return message ?? "حدث خطأ في الخادم"
        case .decodingError: return "خطأ في معالجة البيانات"
        }
    }
}

// MARK: - Helper Types

private struct ErrorResponse: Decodable {
    let error: String
}

private struct TokenRefreshResponse: Decodable {
    let token: String
    let expiresIn: Int
}

struct SuccessResponse: Decodable {
    let success: Bool
    let message: String?
    let thumbnail: String?
}

/// Wrapper to encode Any as Encodable
private struct AnyEncodable: Encodable {
    private let _encode: (Encoder) throws -> Void
    init(_ wrapped: Encodable) {
        _encode = wrapped.encode
    }
    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }
}
