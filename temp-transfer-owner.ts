import { getStorage } from "./server/postgres-storage";

const storage = getStorage();

async function transferOwnership() {
  try {
    const allUsers = await storage.getAllUsers();
    const newOwner = allUsers.find((u: any) => u.email === "kv@m4bank.com");
    if (!newOwner) {
      console.log("User kv@m4bank.com not found");
      return;
    }
    console.log("Found user:", newOwner.id, newOwner.email);

    const roles = await storage.getAllRoles();
    const ownerRole = roles.find((r: any) => r.name === "Владелец");
    const adminRole = roles.find((r: any) => r.name === "Администратор");
    if (!ownerRole) {
      console.log("Owner role not found");
      return;
    }

    const ownerSetting = await storage.getSiteSetting("owner_user_id");
    const currentOwnerId = ownerSetting?.value;
    console.log("Current owner ID:", currentOwnerId);

    if (currentOwnerId) {
      await storage.removeRoleFromUser(currentOwnerId, ownerRole.id);
      console.log("Removed owner role from", currentOwnerId);

      if (adminRole) {
        const currentUserRoles = await storage.getUserRoles(currentOwnerId);
        if (!currentUserRoles.some((r: any) => r.id === adminRole.id)) {
          await storage.assignRoleToUser(currentOwnerId, adminRole.id);
          console.log("Added admin role to previous owner");
        }
      }
    }

    await storage.assignRoleToUser(newOwner.id, ownerRole.id);
    console.log("Assigned owner role to", newOwner.id);

    await storage.setSiteSetting("owner_user_id", newOwner.id);
    console.log("Updated owner_user_id setting");

    console.log("Ownership transferred successfully to kv@m4bank.com");
  } catch (error) {
    console.error("Error:", error);
  }
}

transferOwnership();
