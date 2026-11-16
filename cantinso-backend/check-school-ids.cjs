const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT school_id::text AS school_id, COUNT(*)::int AS total_records
    FROM (
      SELECT school_id FROM users WHERE school_id IS NOT NULL
      UNION ALL SELECT school_id FROM students
      UNION ALL SELECT school_id FROM classrooms
      UNION ALL SELECT school_id FROM attendance_events
      UNION ALL SELECT school_id FROM suppliers
      UNION ALL SELECT school_id FROM inventory_lots
      UNION ALL SELECT school_id FROM meal_plans
      UNION ALL SELECT school_id FROM food_safety_checks
      UNION ALL SELECT school_id FROM hikvision_student_enrollments
    ) AS school_data
    GROUP BY school_id
    ORDER BY school_id
  `);

  console.table(rows);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
