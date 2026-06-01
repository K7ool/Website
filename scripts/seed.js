// Run this in a Node.js environment or paste into Firebase Console → Firestore

const seedData = {
  categories: [
    { name: "Scripts", slug: "scripts", icon: "code", count: 0 },
    { name: "Models", slug: "models", icon: "box", count: 0 },
    { name: "UI Systems", slug: "ui-systems", icon: "layout", count: 0 },
    { name: "Admin Systems", slug: "admin-systems", icon: "shield", count: 0 },
    { name: "Vehicles", slug: "vehicles", icon: "car", count: 0 },
    { name: "Building Systems", slug: "building-systems", icon: "building", count: 0 },
    { name: "Donation Systems", slug: "donation-systems", icon: "heart", count: 0 },
  ],

  products: [
    {
      title: "Advanced Admin System",
      slug: "advanced-admin-system",
      description: "Complete admin panel with ranks, permissions, moderation tools, and customizable commands.",
      price: 24.99, originalPrice: 39.99, category: "Admin Systems", categoryId: "cat-admin",
      image: "", images: [], rating: 4.9, reviewsCount: 0, salesCount: 0,
      features: ["Rank management", "Permission system", "Moderation tools", "Custom commands", "Ban/Kick/Mute", "Logging system"],
      compatibility: ["Roblox Studio", "Luau", "Any Place"],
      installationGuide: "Download the script, insert into ServerScriptService, and configure.",
      fileUrl: "", featured: true, popular: true,
    },
    {
      title: "Premium Vehicle System",
      slug: "premium-vehicle-system",
      description: "Realistic vehicle physics with car customization, fuel system, and multiplayer support.",
      price: 34.99, category: "Vehicles", categoryId: "cat-vehicles",
      image: "", images: [], rating: 4.8, reviewsCount: 0, salesCount: 0,
      features: ["Realistic physics", "Car customization", "Fuel system", "Multiplayer sync", "Speed boost", "Drift mechanics"],
      compatibility: ["Roblox Studio", "Luau", "VehicleSeats"],
      installationGuide: "Import the model, place in workspace, and configure vehicle properties.",
      fileUrl: "", featured: true, popular: true,
    },
    {
      title: "Modern UI Library",
      slug: "modern-ui-library",
      description: "Collection of 200+ modern UI components, animations, and templates for your Roblox games.",
      price: 19.99, originalPrice: 29.99, category: "UI Systems", categoryId: "cat-ui",
      image: "", images: [], rating: 4.7, reviewsCount: 0, salesCount: 0,
      features: ["200+ components", "Dark/Light themes", "Animations", "Mobile responsive", "Easy customization", "Documentation"],
      compatibility: ["Roblox Studio", "Luau", "ScreenGuis"],
      installationGuide: "Insert the UI Library into StarterGui and require the module.",
      fileUrl: "", featured: true, popular: true,
    },
    {
      title: "Donation & VIP System",
      slug: "donation-vip-system",
      description: "Complete donation system with tiers, perks, payment processing, and automatic rank assignment.",
      price: 29.99, category: "Donation Systems", categoryId: "cat-donation",
      image: "", images: [], rating: 4.6, reviewsCount: 0, salesCount: 0,
      features: ["Donation tiers", "VIP perks", "Auto rank assignment", "Payment processing", "Discord integration", "Webhook support"],
      compatibility: ["Roblox Studio", "Luau", "Datastores"],
      installationGuide: "Configure the module with your group ID and donation settings.",
      fileUrl: "", featured: true, popular: false,
    },
    {
      title: "Building System Pro",
      slug: "building-system-pro",
      description: "Advanced building system with grid placement, rotation, snapping, and undo/redo.",
      price: 39.99, category: "Building Systems", categoryId: "cat-building",
      image: "", images: [], rating: 4.8, reviewsCount: 0, salesCount: 0,
      features: ["Grid placement", "Rotation system", "Snapping", "Undo/Redo", "Save/Load builds", "Multiplayer sync"],
      compatibility: ["Roblox Studio", "Luau", "PhysicsService"],
      installationGuide: "Place the BuildingSystem folder into ServerScriptService.",
      fileUrl: "", featured: false, popular: false,
    },
    {
      title: "Orbital Hub \u2013 Admin GUI",
      slug: "orbital-hub-admin-gui",
      description: "Sleek, modern admin GUI with gesture controls, particle effects, and real-time monitoring.",
      price: 44.99, originalPrice: 59.99, category: "Admin Systems", categoryId: "cat-admin",
      image: "", images: [], rating: 4.9, reviewsCount: 0, salesCount: 0,
      features: ["Gesture controls", "Particle effects", "Server monitoring", "Player management", "Script execution", "Custom themes"],
      compatibility: ["Roblox Studio", "Luau", "All Platforms"],
      installationGuide: "Insert into StarterGui, run the setup script, and configure.",
      fileUrl: "", featured: true, popular: true,
    },
    {
      title: "Realistic Weapon System",
      slug: "realistic-weapon-system",
      description: "High-quality weapon system with recoil, scoping, attachments, and damage models.",
      price: 27.99, category: "Scripts", categoryId: "cat-scripts",
      image: "", images: [], rating: 4.7, reviewsCount: 0, salesCount: 0,
      features: ["Recoil system", "Scoping", "Weapon attachments", "Damage models", "Ammo system", "Animation support"],
      compatibility: ["Roblox Studio", "Luau", "Tool system"],
      installationGuide: "Import weapon models, insert scripts into Tools.",
      fileUrl: "", featured: false, popular: true,
    },
    {
      title: "Neon UI Pack",
      slug: "neon-ui-pack",
      description: "Cyberpunk-themed UI pack with neon gradients, animated borders, and holographic effects.",
      price: 14.99, category: "UI Systems", categoryId: "cat-ui",
      image: "", images: [], rating: 4.5, reviewsCount: 0, salesCount: 0,
      features: ["Neon gradients", "Animated borders", "Holographic effects", "Cyberpunk theme", "50+ screens", "Figma source"],
      compatibility: ["Roblox Studio", "Luau", "ScreenGuis"],
      installationGuide: "Insert the NeonUI folder into StarterGui.",
      fileUrl: "", featured: false, popular: false,
    },
  ],
};

// Paste this block into Firebase Console → Firestore → + Start Collection
// Or run as a script with firebase-admin

console.log("Seed data ready. Create collections:");
console.log("- categories (7 docs)");
console.log("- products (8 docs)");
console.log("- profiles (auto-created on signup)");
console.log("Then enable Firebase Auth → Email/Password + Google + Discord + Roblox OAuth providers.");
