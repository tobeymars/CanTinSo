const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    const password = process.env.NEW_ADMIN_PASSWORD;

    if (!password || password.length < 8) {
        throw new Error("Mat khau phai co it nhat 8 ky tu");
    }

    const hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
        where: { email: "admin@cantinso.local" },
        data: {
            passwordHash: hash,
            isActive: true
        }
    });

    console.log("Da dat lai mat khau cho:", user.email);
}

main()
    .catch(error => {
        console.error("LOI:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
