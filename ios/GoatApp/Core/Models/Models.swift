import Foundation

// MARK: - Auth Models

struct LoginResponse: Decodable {
    let id: String
    let fullName: String
    let role: String
    let tenantId: String
    let farmId: String
    let farmName: String
    let token: String
}

struct MeResponse: Decodable {
    let user: UserInfo
    let farm: Farm?
    let farms: [FarmListItem]
    let permissions: [String]
}

struct UserInfo: Codable, Identifiable {
    let id: String
    let fullName: String
    var username: String?
    let role: String
    let tenantId: String?
    let farmId: String?
}

// MARK: - Farm Models

struct Farm: Codable, Identifiable {
    let id: String
    let name: String
    let nameAr: String?
    let currency: String?
    let farmType: String?
    
    var displayName: String { nameAr ?? name }
}

struct FarmListItem: Codable, Identifiable {
    let id: String
    let name: String
    let nameAr: String?
    let farmType: String?
    let role: String
    var tenantName: String?
    var tenantId: String?
    
    var displayName: String { nameAr ?? name }
}

struct FarmSwitchResponse: Decodable {
    let farmId: String
    let farmName: String
    let farmNameAr: String?
    let token: String
}

struct FarmDetail: Codable, Identifiable {
    let id: String
    let name: String
    let nameAr: String?
    let farmType: String?
    let phone: String?
    let address: String?
    let currency: String?
    let isActive: Bool?
    var role: String?
    var goatsCount: Int?
    var pensCount: Int?
    var usersCount: Int?
    let createdAt: Date?
    
    var displayName: String { nameAr ?? name }
}

// MARK: - Goat Models

struct Goat: Codable, Identifiable {
    let id: String
    let tenantId: String?
    let farmId: String?
    let tagId: String
    let name: String?
    let breedId: String?
    let gender: String  // MALE | FEMALE
    let birthDate: Date?
    let weight: Double?
    let color: String?
    let tagColor: String?
    let status: String  // ACTIVE | SOLD | DECEASED | QUARANTINE | EXTERNAL
    let motherId: String?
    let fatherId: String?
    let motherTagId: String?
    let fatherTagId: String?
    let penId: String?
    let purchaseDate: Date?
    let purchasePrice: Double?
    let ownerName: String?
    let ownerId: String?
    let notes: String?
    let thumbnail: String?
    let image: String?
    let createdAt: Date?
    let updatedAt: Date?
    
    // Relations
    let breed: Breed?
    let pen: PenBasic?
    let owner: OwnerBasic?
    let age: GoatAge?
    
    // Pregnancy
    let pregnancyStatus: String?
    let dueDate: Date?
    
    var displayName: String {
        name ?? tagId
    }
    
    var genderAr: String {
        gender == "MALE" ? "ذكر" : "أنثى"
    }
    
    var statusAr: String {
        switch status {
        case "ACTIVE": return "نشط"
        case "SOLD": return "مباع"
        case "DECEASED": return "نافق"
        case "QUARANTINE": return "حجر"
        case "EXTERNAL": return "خارجي"
        default: return status
        }
    }
    
    var statusColor: String {
        switch status {
        case "ACTIVE": return "green"
        case "SOLD": return "blue"
        case "DECEASED": return "red"
        case "QUARANTINE": return "orange"
        case "EXTERNAL": return "gray"
        default: return "gray"
        }
    }
    
    var thumbnailImage: Data? {
        guard let thumbnail, thumbnail.contains("base64,") else { return nil }
        let base64 = thumbnail.components(separatedBy: "base64,").last ?? ""
        return Data(base64Encoded: base64)
    }
}

struct GoatAge: Codable {
    let years: Int
    let months: Int
    let days: Int
    let totalMonths: Int
    let category: String?
    let formatted: String?
    
    var displayAge: String {
        if let formatted { return formatted }
        if years > 0 { return "\(years) سنة و \(months) شهر" }
        if months > 0 { return "\(months) شهر و \(days) يوم" }
        return "\(days) يوم"
    }
}

struct GoatCreateRequest: Encodable {
    let tagId: String
    var name: String?
    let breedId: String
    let gender: String
    let birthDate: String
    var weight: Double?
    var color: String?
    var tagColor: String?
    var status: String?
    var motherId: String?
    var fatherId: String?
    var penId: String?
    var purchaseDate: String?
    var purchasePrice: Double?
    var ownerId: String?
    var notes: String?
}

// MARK: - Paginated Response

struct PaginatedResponse<T: Decodable>: Decodable {
    let data: [T]
    let total: Int
    let page: Int
    let limit: Int
    let totalPages: Int
}

// MARK: - Breed Models

struct Breed: Codable, Identifiable {
    let id: String
    let name: String?
    let nameAr: String?
    let type: GoatType?
    let avgWeight: Double?
    
    var displayName: String { nameAr ?? name ?? "غير محدد" }
}

struct GoatType: Codable, Identifiable {
    let id: String
    let name: String?
    let nameAr: String?
    
    var displayName: String { nameAr ?? name ?? "غير محدد" }
}

// MARK: - Pen Models

struct PenBasic: Codable, Identifiable {
    let id: String
    let name: String?
    let nameAr: String?
    
    var displayName: String { nameAr ?? name ?? "" }
}

struct Pen: Codable, Identifiable {
    let id: String
    let tenantId: String?
    let farmId: String?
    let name: String?
    let nameAr: String?
    let capacity: Int?
    let type: String?
    let notes: String?
    let createdAt: Date?
    var currentCount: Int?
    
    var displayName: String { nameAr ?? name ?? "" }
    
    struct PenCount: Codable {
        let goats: Int?
    }
    let _count: PenCount?
}

struct PenCreateRequest: Encodable {
    var name: String?
    let nameAr: String
    var capacity: Int?
    var type: String?
    var notes: String?
}

// MARK: - Owner Models

struct OwnerBasic: Codable, Identifiable {
    let id: String
    let name: String
    let phone: String?
}

// MARK: - Health Models

struct HealthRecord: Codable, Identifiable {
    let id: String
    let goatId: String
    let type: String   // VACCINATION | DEWORMING | TREATMENT | CHECKUP | SURGERY
    let date: Date
    let description: String
    let veterinarian: String?
    let medication: String?
    let dosage: String?
    let cost: Double?
    let nextDueDate: Date?
    let notes: String?
    let createdAt: Date?
    let goat: Goat?
    
    var typeAr: String {
        switch type {
        case "VACCINATION": return "تطعيم"
        case "DEWORMING": return "تطفيل"
        case "TREATMENT": return "علاج"
        case "CHECKUP": return "فحص"
        case "SURGERY": return "عملية"
        default: return type
        }
    }
    
    var typeIcon: String {
        switch type {
        case "VACCINATION": return "syringe"
        case "DEWORMING": return "pill"
        case "TREATMENT": return "cross.case"
        case "CHECKUP": return "stethoscope"
        case "SURGERY": return "scissors"
        default: return "heart"
        }
    }
}

struct HealthCreateRequest: Encodable {
    let goatId: String
    let type: String
    let date: String
    let description: String
    var veterinarian: String?
    var medication: String?
    var dosage: String?
    var cost: Double?
    var nextDueDate: String?
    var notes: String?
    var moveToIsolation: Bool?
}

// MARK: - Breeding Models

struct BreedingRecord: Codable, Identifiable {
    let id: String
    let motherId: String
    let fatherId: String?
    let matingDate: Date
    let pregnancyStatus: String  // MATED | PREGNANT | DELIVERED | FAILED
    let dueDate: Date?
    let birthDate: Date?
    let numberOfKids: Int?
    let notes: String?
    let createdAt: Date?
    let mother: Goat?
    let father: Goat?
    let births: [Birth]?
    
    var statusAr: String {
        switch pregnancyStatus {
        case "MATED": return "تم التلقيح"
        case "PREGNANT": return "حامل"
        case "DELIVERED": return "ولدت"
        case "FAILED": return "فشل"
        default: return pregnancyStatus
        }
    }
    
    var statusColor: String {
        switch pregnancyStatus {
        case "MATED": return "blue"
        case "PREGNANT": return "orange"
        case "DELIVERED": return "green"
        case "FAILED": return "red"
        default: return "gray"
        }
    }
}

struct Birth: Codable, Identifiable {
    let id: String
    let breedingId: String?
    let kidTagId: String
    let kidGoatId: String?
    let gender: String
    let weight: Double?
    let status: String  // ALIVE | STILLBORN | DIED
    let notes: String?
}

struct BreedingCreateRequest: Encodable {
    let motherId: String
    var fatherId: String?
    let matingDate: String
    var pregnancyStatus: String?
    var dueDate: String?
    var notes: String?
}

// MARK: - Feed Models

struct FeedType: Codable, Identifiable {
    let id: String
    let name: String?
    let nameAr: String
    let category: String  // HAY | GRAINS | CONCENTRATE | SUPPLEMENTS | MINERALS | OTHER
    let protein: Double?
    let energy: Double?
    let unitPrice: Double?
    let reorderLevel: Double?
    let notes: String?
    let stock: [FeedStock]?
    let schedules: [FeedSchedule]?
    
    var displayName: String { nameAr }
    
    var categoryAr: String {
        switch category {
        case "HAY": return "تبن"
        case "GRAINS": return "حبوب"
        case "CONCENTRATE": return "مركز"
        case "SUPPLEMENTS": return "مكملات"
        case "MINERALS": return "معادن"
        case "OTHER": return "أخرى"
        default: return category
        }
    }
    
    var totalStock: Double {
        stock?.reduce(0) { $0 + $1.quantity } ?? 0
    }
}

struct FeedStock: Codable, Identifiable {
    let id: String
    let feedTypeId: String?
    let quantity: Double
    let unit: String?
    let purchaseDate: Date?
    let expiryDate: Date?
    let cost: Double?
    let supplier: String?
}

struct FeedSchedule: Codable, Identifiable {
    let id: String
    let feedTypeId: String?
    let penId: String?
    let quantity: Double?
    let frequency: Int?
    let isActive: Bool?
    let pen: PenBasic?
}

// MARK: - Sale Models

struct Sale: Codable, Identifiable {
    let id: String
    let goatId: String?
    let date: Date
    let buyerName: String
    let buyerPhone: String?
    let salePrice: Double
    let paymentStatus: String  // PENDING | PARTIAL | PAID
    let notes: String?
    let createdAt: Date?
    let goat: Goat?
    let payments: [Payment]?
    let totalPaid: Double?
    let remaining: Double?
    
    var statusAr: String {
        switch paymentStatus {
        case "PENDING": return "معلق"
        case "PARTIAL": return "جزئي"
        case "PAID": return "مدفوع"
        default: return paymentStatus
        }
    }
    
    var statusColor: String {
        switch paymentStatus {
        case "PAID": return "green"
        case "PARTIAL": return "orange"
        case "PENDING": return "red"
        default: return "gray"
        }
    }
}

struct Payment: Codable, Identifiable {
    let id: String
    let saleId: String?
    let amount: Double
    let paymentDate: Date?
    let paymentMethod: String?  // CASH | TRANSFER | CHECK | OTHER
    let notes: String?
}

struct SaleCreateRequest: Encodable {
    var goatId: String?
    let date: String
    let buyerName: String
    var buyerPhone: String?
    let salePrice: Double
    var paidAmount: Double?
    var ownerId: String?
    var notes: String?
}

// MARK: - Expense Models

struct Expense: Codable, Identifiable {
    let id: String
    let category: String
    let amount: Double
    let date: Date
    let description: String?
    let vendor: String?
    let notes: String?
    let createdAt: Date?
    
    var categoryAr: String {
        switch category {
        case "FEED": return "أعلاف"
        case "VETERINARY": return "بيطري"
        case "LABOR": return "عمالة"
        case "EQUIPMENT": return "معدات"
        case "MAINTENANCE": return "صيانة"
        case "TRANSPORT": return "نقل"
        case "UTILITIES": return "خدمات"
        case "OTHER": return "أخرى"
        default: return category
        }
    }
}

// MARK: - Stats Models

struct DashboardStats: Decodable {
    let totalGoats: Int
    let activeGoats: Int
    let maleGoats: Int
    let femaleGoats: Int
    let pregnantGoats: Int
    let totalExpenses: Double
    let totalSales: Double
    let netProfit: Double
    let activeBreedings: Int
    let lowStockCount: Int
    let totalBreeds: Int
    
    let expensesByMonth: [MonthlyAmount]?
    let salesByMonth: [MonthlyAmount]?
    let feedConsumption: FeedConsumptionStat?
    let monthly: MonthlySummary?
    let comparison: StatsComparison?
}

struct MonthlyAmount: Decodable {
    let month: Int
    let name: String
    let amount: Double
}

struct FeedConsumptionStat: Decodable {
    let quantity: Double
    let cost: Double
    let hasLogs: Bool
}

struct MonthlySummary: Decodable {
    let totalSales: Double
    let totalExpenses: Double
    let netProfit: Double
    let salesCount: Int
    let birthsCount: Int
    let deathsCount: Int
    let herdGrowth: Int
    let mortalityRate: Double?
}

struct StatsComparison: Decodable {
    let totalSales: Double?
    let totalExpenses: Double?
    let netProfit: Double?
}
