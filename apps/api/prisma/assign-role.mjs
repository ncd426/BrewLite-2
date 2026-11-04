// Run manually in the trusted API container after Prisma migration.
// Usage: node prisma/assign-role.mjs <existing-email> <ADMIN|STAFF|CUSTOMER>
// Never create default admin credentials in seed or in source control.
import { PrismaClient, UserRole } from '@prisma/client';

const [, , rawEmail, rawRole] = process.argv;
const email = rawEmail?.trim().toLowerCase();
const role = rawRole?.trim().toUpperCase();
const choices = Object.values(UserRole);
if (!email || !email.includes('@') || !choices.includes(role)) {
  console.error('Usage: node prisma/assign-role.mjs <existing-email> <ADMIN|STAFF|CUSTOMER>');
  process.exit(2);
}
const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!user) throw new Error('Account not found. Register the account first.');
  if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
    const count = await prisma.user.count({ where: { role: UserRole.ADMIN } });
    if (count <= 1) throw new Error('Cannot demote the last ADMIN');
  }
  const updated = await prisma.user.update({
    where: { id: user.id }, data: { role },
    select: { id: true, email: true, role: true },
  });
  console.log('Updated account role:', updated);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
