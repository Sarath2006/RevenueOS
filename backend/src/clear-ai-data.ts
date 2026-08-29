import { prisma } from "./config/database";

async function clearAIData() {
  try {
    console.log("============================================");
    console.log("CLEARING AI TEST DATA");
    console.log("============================================");

    // Delete audit logs first.
    // This is safer because AIAuditLog references AIDecision.
    const auditResult =
      await prisma.aIAuditLog.deleteMany({});

    console.log(
      `AIAuditLog deleted: ${auditResult.count}`,
    );

    // Delete AI decisions.
    const decisionResult =
      await prisma.aIDecision.deleteMany({});

    console.log(
      `AIDecision deleted: ${decisionResult.count}`,
    );

    console.log("");
    console.log("============================================");
    console.log("AI DATA CLEARED SUCCESSFULLY");
    console.log("============================================");
  } catch (error) {
    console.error(
      "Failed to clear AI data:",
      error,
    );

    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

clearAIData();