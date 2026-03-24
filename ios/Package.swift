// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "GoatApp",
    defaultLocalization: "ar",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "GoatApp", targets: ["GoatApp"]),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "GoatApp",
            path: "GoatApp"
        ),
    ]
)
