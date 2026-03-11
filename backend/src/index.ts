import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt, sign } from 'hono/jwt';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// ============================================
// SECURITY HELPERS (Web Crypto API)
// ============================================

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Enable CORS
app.use('/*', cors({
  origin: [
    'https://apichai-crm.pages.dev',
    'https://*.apichai-crm.pages.dev',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// ============================================
// JWT MIDDLEWARE (Protect all /api routes except login)
// ============================================

app.use('/api/*', async (c, next) => {
  const path = c.req.path.replace(/\/$/, ''); // Remove trailing slash for comparison

  // Bypass JWT for login and health check
  if (path === '/api/auth/login' || path === '/api' || path === '') {
    return next();
  }

  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET || 'your-default-secure-secret-key',
    alg: 'HS256'
  });

  return jwtMiddleware(c, next);
});

// Health check
app.get('/', (c) => {
  return c.json({ message: 'Apichai API - Secured' });
});

// Get all customers
app.get('/api/customers', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM customers ORDER BY CASE WHEN importOrder IS NOT NULL THEN importOrder ELSE 999999 END, id ASC'
    ).all();

    // Convert SQLite integers to proper types
    const customers = results.map((row: any) => ({
      ...row,
      isUQL: row.isUQL || '',
      isMQL: row.isMQL || '',
      isSQL: row.isSQL || '',
      isInactive: Boolean(row.isInactive),
    }));

    return c.json(createApiResponse(customers));
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get customer by ID
app.get('/api/customers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM customers WHERE id = ?'
    ).bind(id).all();

    if (results.length === 0) {
      return c.json({ success: false, error: 'Customer not found' }, 404);
    }

    const customer = results[0] as any;
    const formattedCustomer = {
      ...customer,
      isUQL: customer.isUQL || '',
      isMQL: customer.isMQL || '',
      isSQL: customer.isSQL || '',
      isInactive: Boolean(customer.isInactive),
    };

    return c.json(createApiResponse(formattedCustomer));
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create new customer
app.post('/api/customers', async (c) => {
  try {
    const body = await c.req.json();

    // Use Asia/Bangkok time for YYYY-MM-DD if not provided in body
    const bangkokDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const createdAt = body.createdAt || bangkokDate;
    const updatedAt = bangkokDate;

    // Generate customer ID in format: {country}{year}{month}{5-digit-sequence}
    // e.g. TH20260200001, IN20260200018
    // If a customerId is already provided (e.g. from import), keep it as-is
    let customerId = body.customerId;
    if (!customerId) {
      const country = (body.country || 'TH').toUpperCase() === 'IN' ? 'IN' : 'TH';
      const dateParts = createdAt.split('-'); // ["2026", "02", "19"]
      const year = dateParts[0];   // "2026"
      const month = dateParts[1];  // "02"
      const prefix = `${country}${year}${month}`;  // e.g. "TH202602"

      // Use MAX instead of COUNT to avoid race conditions during bulk import
      // Find the highest sequence number for this prefix
      const { results: maxResult } = await c.env.DB.prepare(
        "SELECT MAX(CAST(SUBSTR(customerId, LENGTH(?) + 1) AS INTEGER)) as maxSeq FROM customers WHERE customerId LIKE ?"
      ).bind(prefix, `${prefix}%`).all();

      const maxSeq = (maxResult[0] as any)?.maxSeq || 0;
      const sequence = maxSeq + 1;
      customerId = `${prefix}${String(sequence).padStart(5, '0')}`;
      // e.g. "TH202602" + "00001" = "TH20260200001"
    }


    let assignedSales = body.assignedSales || '-';
    let assignedDoctor = body.assignedDoctor || '-';

    // ============================================
    // 🔒 VALIDATE ASSIGNED SALES & DOCTOR
    // ============================================
    // Validate assignedSales - check if exists in users table but KEEP value regardless
    if (assignedSales && assignedSales !== '-') {
      const { results: salesCheck } = await c.env.DB.prepare(
        "SELECT id FROM users WHERE name = ? AND role = 'SALES' AND status = 'active'"
      ).bind(assignedSales).all();

      if (salesCheck.length === 0) {
        // Sales not found in active list, we keep it anyway (could be historical or from import)
        console.warn(`Sales name not found in active users: ${assignedSales}. Keeping value.`);
      }
    }

    // Validate assignedDoctor - check if exists in users table but KEEP value regardless
    if (assignedDoctor && assignedDoctor !== '-') {
      const { results: doctorCheck } = await c.env.DB.prepare(
        "SELECT id FROM users WHERE name = ? AND role = 'DOCTOR' AND status = 'active'"
      ).bind(assignedDoctor).all();

      if (doctorCheck.length === 0) {
        // Doctor not found in active list, we keep it anyway
        console.warn(`Doctor name not found in active users: ${assignedDoctor}. Keeping value.`);
      }
    }

    // ============================================
    // 🧙‍♂️ AUTO-ASSIGNMENT LOGIC (New Customer)
    // Only run for manually added customers, skip for imports
    // ============================================
    if (body.lifecycleStage === 'SQL' && !body.importOrder) {
      const bangkokToday = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      // 1.1 Sales Assignment
      const customerCountry = body.country || 'TH';
      let serviceCategory = 'Surgery';
      if (body.serviceInterest) {
        const { results: allServices } = await c.env.DB.prepare(
          "SELECT name, category FROM services WHERE isActive = 1"
        ).all();
        const normalize = (s: string) => s.toLowerCase().trim();
        const targetNorm = normalize(body.serviceInterest);
        const match = (allServices as any[]).find(s => 
          normalize(s.name) === targetNorm || targetNorm.includes(normalize(s.name))
        );
        if (match) {
          serviceCategory = match.category;
        }
      }
      if (assignedSales === '-') {
        const { results: allSales } = await c.env.DB.prepare(
          "SELECT id, name, queueOrder, country, caseType FROM users WHERE role = 'SALES' AND status = 'active' ORDER BY queueOrder ASC, id ASC"
        ).all();

        const filteredSales = (allSales as any[]).filter(u => {
          const matchCountry = (u.country === 'BOTH' || u.country === customerCountry);
          const matchType = (u.caseType === 'BOTH' || u.caseType === serviceCategory);
          return matchCountry && matchType;
        });

        if (filteredSales.length > 0) {
          const { results: dailyCounts } = await c.env.DB.prepare(
            "SELECT assignedSales, COUNT(*) as count FROM customers WHERE createdAt = ? AND assignedSales IS NOT NULL GROUP BY assignedSales"
          ).bind(bangkokToday).all();
          const counts: Record<string, number> = {};
          dailyCounts.forEach((r: any) => counts[r.assignedSales] = r.count);

          const bestSales = filteredSales.sort((a, b) => {
            const countA = counts[a.name] || 0;
            const countB = counts[b.name] || 0;
            if (countA !== countB) return countA - countB;
            return (a.queueOrder || 999) - (b.queueOrder || 999);
          })[0];
          if (bestSales) assignedSales = bestSales.name;
        }
      }

      // Rotate Sales (if assigned)
      if (assignedSales !== '-') {
        const { results: salesUser } = await c.env.DB.prepare(
          "SELECT id FROM users WHERE name = ? AND role = 'SALES'"
        ).bind(assignedSales).all();
        if (salesUser.length > 0) {
          const { results: allSales } = await c.env.DB.prepare(
            "SELECT id, queueOrder FROM users WHERE role = 'SALES' AND status = 'active' ORDER BY queueOrder ASC, id ASC"
          ).all();
          const reorderedSales = (allSales as any[])
            .map(u => ({ ...u, queueOrder: u.id === (salesUser[0] as any).id ? 9999 : (u.queueOrder || 0) }))
            .sort((a, b) => a.queueOrder - b.queueOrder || a.id - b.id);

          for (let i = 0; i < reorderedSales.length; i++) {
            await c.env.DB.prepare("UPDATE users SET queueOrder = ? WHERE id = ?").bind(i + 1, reorderedSales[i].id).run();
          }
        }
      }

      // 1.2 Doctor Assignment
      if (body.serviceInterest) {
        const targetService = body.serviceInterest;
        const { results: allServices } = await c.env.DB.prepare("SELECT id, name FROM services WHERE isActive = 1").all();
        const normalize = (name: string) => name.replace(/^[\d.]+\s*/, '').trim().toLowerCase();
        const targetNormalized = normalize(targetService);
        const service = (allServices as any[]).find(s => s.name === targetService || normalize(s.name) === targetNormalized);

        if (service) {
          if (assignedDoctor === '-') {
            const { results: serviceDoctors } = await c.env.DB.prepare(
              "SELECT id, doctorName, displayOrder FROM service_doctors WHERE serviceId = ? AND isActive = 1 ORDER BY displayOrder ASC, id ASC"
            ).bind(service.id).all();
            if (serviceDoctors.length > 0) {
              assignedDoctor = (serviceDoctors[0] as any).doctorName;
            }
          }

          // Rotate Doctor (if assigned)
          if (assignedDoctor !== '-') {
            const { results: allDocMappings } = await c.env.DB.prepare(
              "SELECT id, serviceId FROM service_doctors WHERE doctorName = ? AND isActive = 1"
            ).bind(assignedDoctor).all();

            for (const mapping of (allDocMappings as any[])) {
              const { results: siblingDoctors } = await c.env.DB.prepare(
                "SELECT id, displayOrder FROM service_doctors WHERE serviceId = ? AND isActive = 1 ORDER BY displayOrder ASC, id ASC"
              ).bind(mapping.serviceId).all();

              const reordered = (siblingDoctors as any[])
                .map(d => ({ ...d, displayOrder: d.id === mapping.id ? 9999 : d.displayOrder }))
                .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);

              for (let i = 0; i < reordered.length; i++) {
                await c.env.DB.prepare("UPDATE service_doctors SET displayOrder = ? WHERE id = ?").bind(i + 1, reordered[i].id).run();
              }
            }
          }
        }
      }
    }

    // Retry logic for handling race conditions during bulk import
    let insertSuccess = false;
    let retries = 0;
    const maxRetries = 5;
    let finalCustomerId = customerId;

    while (!insertSuccess && retries < maxRetries) {
      try {
        const result = await c.env.DB.prepare(`
          INSERT INTO customers (
            customerId, displayName, phone, email, platform, lineUid, lineId,
            country, source, serviceInterest, lifecycleStage, status, reasonLost,
            isUQL, isMQL, isSQL, mqlToSqlDays, isCloseWon, closeWonMonth,
            assignedSales, assignedDoctor, revenueWeight, isInactive, notes, remark,
            month, importOrder, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          finalCustomerId,
          body.displayName,
          body.phone,
          body.email,
          body.platform,
          body.lineUid || null,
          body.lineId || null,
          body.country || 'TH',
          body.source,
          body.serviceInterest || null,
          body.lifecycleStage,
          body.status,
          body.reasonLost || null,
          body.isUQL || '',
          body.isMQL || '',
          body.isSQL || '',
          body.mqlToSqlDays || null,
          body.isCloseWon ? 1 : 0,
          body.closeWonMonth || null,
          assignedSales,
          assignedDoctor,
          body.revenueWeight || '-',
          body.isInactive ? 1 : 0,
          body.notes || null,
          body.remark || null,
          body.month || null,
          body.importOrder || null,
          createdAt,
          updatedAt
        ).run();

        insertSuccess = true;
        return c.json({
          success: true,
          data: { id: result.meta.last_row_id, customerId: finalCustomerId, ...body, assignedSales, assignedDoctor, createdAt }
        }, 201);

      } catch (insertError: any) {
        // If UNIQUE constraint failed, regenerate customerId and retry
        if (insertError.message && insertError.message.includes('UNIQUE constraint failed')) {
          retries++;
          if (retries < maxRetries) {
            // Regenerate customerId with a new sequence number
            const country = (body.country || 'TH').toUpperCase() === 'IN' ? 'IN' : 'TH';
            const dateParts = createdAt.split('-');
            const year = dateParts[0];
            const month = dateParts[1];
            const prefix = `${country}${year}${month}`;

            // Query again for the latest max sequence
            const { results: maxResult } = await c.env.DB.prepare(
              "SELECT MAX(CAST(SUBSTR(customerId, LENGTH(?) + 1) AS INTEGER)) as maxSeq FROM customers WHERE customerId LIKE ?"
            ).bind(prefix, `${prefix}%`).all();

            const maxSeq = (maxResult[0] as any)?.maxSeq || 0;
            const sequence = maxSeq + retries; // Add retry count to avoid collision
            finalCustomerId = `${prefix}${String(sequence).padStart(5, '0')}`;
          } else {
            throw insertError; // Max retries reached
          }
        } else {
          throw insertError; // Different error, don't retry
        }
      }
    }

    // If we get here, max retries reached
    throw new Error('Failed to insert customer after maximum retries');
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/api/queue/next', async (c) => {
  try {
    const serviceInterest = c.req.query('serviceInterest');
    const country = c.req.query('country') || 'TH';
    const lifecycleStage = c.req.query('lifecycleStage');

    if (lifecycleStage !== 'SQL') {
      return c.json({ success: true, assignedSales: '-', assignedDoctor: '-' });
    }

    const bangkokToday = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    let assignedSales = '-';
    let assignedDoctor = '-';

    // Sales Logic
    let serviceCategory = 'Surgery';
    if (serviceInterest) {
      const { results: allServices } = await c.env.DB.prepare(
        "SELECT name, category FROM services WHERE isActive = 1"
      ).all();
      const normalize = (s: string) => s.toLowerCase().trim();
      const targetNorm = normalize(serviceInterest);
      const match = (allServices as any[]).find(s => 
        normalize(s.name) === targetNorm || targetNorm.includes(normalize(s.name))
      );
      if (match) {
        serviceCategory = match.category;
      }
    }

    const { results: allSales } = await c.env.DB.prepare(
      "SELECT name, queueOrder, country, caseType FROM users WHERE role = 'SALES' AND status = 'active' ORDER BY queueOrder ASC"
    ).all();

    const filteredSales = (allSales as any[]).filter(u => {
      const matchCountry = (u.country === 'BOTH' || u.country === country);
      const matchType = (u.caseType === 'BOTH' || u.caseType === serviceCategory);
      return matchCountry && matchType;
    });

    if (filteredSales.length > 0) {
      const { results: dailyCounts } = await c.env.DB.prepare(
        "SELECT assignedSales, COUNT(*) as count FROM customers WHERE createdAt = ? AND assignedSales IS NOT NULL GROUP BY assignedSales"
      ).bind(bangkokToday).all();
      const counts: Record<string, number> = {};
      dailyCounts.forEach((r: any) => counts[r.assignedSales] = r.count);

      const bestSales = filteredSales.sort((a, b) => {
        const countA = counts[a.name] || 0;
        const countB = counts[b.name] || 0;
        if (countA !== countB) return countA - countB;
        return (a.queueOrder || 999) - (b.queueOrder || 999);
      })[0];
      if (bestSales) assignedSales = bestSales.name;
    }

    // Doctor Logic
    if (serviceInterest) {
      const { results: allServices } = await c.env.DB.prepare("SELECT id, name FROM services WHERE isActive = 1").all();
      const normalize = (name: string) => name.replace(/^[\d.]+\s*/, '').trim().toLowerCase();
      const targetNormalized = normalize(serviceInterest);
      const service = (allServices as any[]).find(s => s.name === serviceInterest || normalize(s.name) === targetNormalized);

      if (service) {
        const { results: serviceDoctors } = await c.env.DB.prepare(
          "SELECT doctorName, displayOrder FROM service_doctors WHERE serviceId = ? AND isActive = 1 ORDER BY displayOrder ASC, id ASC"
        ).bind(service.id).all();
        if (serviceDoctors.length > 0) {
          assignedDoctor = (serviceDoctors[0] as any).doctorName;
        }
      }
    }

    return c.json({ success: true, data: { assignedSales, assignedDoctor } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update customer
app.put('/api/customers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    // Use Asia/Bangkok time for YYYY-MM-DD
    const updatedAt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // Get current customer data first
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM customers WHERE id = ?'
    ).bind(id).all();

    if (results.length === 0) {
      return c.json({ success: false, error: 'Customer not found' }, 404);
    }

    const currentCustomer = results[0] as any;
    let updatedPayload = { ...body };

    // ============================================
    // 🔄 AUTO-UPDATE CUSTOMER ID when country changes
    // e.g. TH → IN: TH20260200001 → IN20260200001
    // ============================================
    const newCountry = (updatedPayload.country || currentCustomer.country || 'TH').toUpperCase();
    const oldCustomerId: string = currentCustomer.customerId || '';
    const oldCountryFromId = oldCustomerId.match(/^(TH|IN)/)?.[1];
    // Only re-generate if: country changed AND current ID follows the TH/IN pattern
    if (oldCountryFromId && oldCountryFromId !== newCountry && /^(TH|IN)\d{8}/.test(oldCustomerId)) {
      const customerCreatedAt = updatedPayload.createdAt || currentCustomer.createdAt || updatedAt;
      const dateParts = customerCreatedAt.split('-');
      const year = dateParts[0];   // e.g. "2026"
      const month = dateParts[1];  // e.g. "02"
      const newPrefix = `${newCountry}${year}${month}`;  // e.g. "IN202602"

      // Count existing customers with new prefix to find next sequence
      const { results: countResult } = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM customers WHERE customerId LIKE ? AND id != ?"
      ).bind(`${newPrefix}%`, id).all();

      const sequence = ((countResult[0] as any).count || 0) + 1;
      updatedPayload.customerId = `${newPrefix}${String(sequence).padStart(5, '0')}`;
    }

    // ============================================
    // 🧙‍♂️ AUTO-ASSIGNMENT LOGIC (Backend Migration)
    // ============================================

    // Constants for logic
    const bangkokToday = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // Case 1: MQL -> SQL (Auto-assign Sales and Doctor)
    if (body.lifecycleStage === 'SQL' && currentCustomer.lifecycleStage !== 'SQL') {

      // 1.1 Sales Assignment Logic
      if (!currentCustomer.assignedSales || currentCustomer.assignedSales === "" || currentCustomer.assignedSales === "-") {
        // Detect Service Category
        const targetService = updatedPayload.serviceInterest || currentCustomer.serviceInterest;
        let serviceCategory = 'Surgery'; // Default
        if (targetService) {
          const { results: allServices } = await c.env.DB.prepare(
            "SELECT name, category FROM services WHERE isActive = 1"
          ).all();
          const normalize = (s: string) => s.toLowerCase().trim();
          const targetNorm = normalize(targetService);
          const match = (allServices as any[]).find(s => 
            normalize(s.name) === targetNorm || targetNorm.includes(normalize(s.name))
          );
          if (match) {
            serviceCategory = match.category;
          }
        }

        const customerCountry = updatedPayload.country || currentCustomer.country || 'TH';

        const { results: allSales } = await c.env.DB.prepare(
          "SELECT id, name, queueOrder, country, caseType FROM users WHERE role = 'SALES' AND status = 'active' ORDER BY queueOrder ASC, id ASC"
        ).all();

        // If no sales assigned yet, or current is '-', pick next
        if (!currentCustomer.assignedSales || currentCustomer.assignedSales === "" || currentCustomer.assignedSales === "-" || updatedPayload.assignedSales === "-") {
          const filteredSales = (allSales as any[]).filter(u => {
            const matchCountry = (u.country === 'BOTH' || u.country === customerCountry);
            const matchType = (u.caseType === 'BOTH' || u.caseType === serviceCategory);
            return matchCountry && matchType;
          });

          if (filteredSales.length > 0) {
            const { results: dailyCounts } = await c.env.DB.prepare(
              "SELECT assignedSales, COUNT(*) as count FROM customers WHERE createdAt = ? AND assignedSales IS NOT NULL GROUP BY assignedSales"
            ).bind(bangkokToday).all();
            const counts: Record<string, number> = {};
            dailyCounts.forEach((r: any) => counts[r.assignedSales] = r.count);

            const bestSales = filteredSales.sort((a, b) => {
              const countA = counts[a.name] || 0;
              const countB = counts[b.name] || 0;
              if (countA !== countB) return countA - countB;
              return (a.queueOrder || 999) - (b.queueOrder || 999);
            })[0];

            if (bestSales) {
              updatedPayload.assignedSales = bestSales.name;
            }
          }
        }

        // Rotate Sales (if assigned now)
        const finalSales = updatedPayload.assignedSales || currentCustomer.assignedSales;
        if (finalSales && finalSales !== "-") {
          const salesUser = (allSales as any[]).find(u => u.name === finalSales);
          if (salesUser) {
            const reorderedSales = (allSales as any[])
              .map(u => ({ ...u, queueOrder: u.id === salesUser.id ? 9999 : (u.queueOrder || 0) }))
              .sort((a, b) => a.queueOrder - b.queueOrder || a.id - b.id);

            for (let i = 0; i < reorderedSales.length; i++) {
              await c.env.DB.prepare("UPDATE users SET queueOrder = ? WHERE id = ?").bind(i + 1, reorderedSales[i].id).run();
            }
          }
        }
      }

      // 1.2 Doctor Assignment Logic
      const targetService = updatedPayload.serviceInterest || currentCustomer.serviceInterest;
      console.log('Doctor Assignment - targetService:', targetService);
      if (targetService) {
        const { results: allServices } = await c.env.DB.prepare("SELECT id, name FROM services WHERE isActive = 1").all();
        // Normalize: remove code prefix (e.g., "H001 "), extra spaces, and convert to lowercase
        const normalize = (name: string) => name.replace(/^[A-Z]\d+\s+/, '').trim().toLowerCase();
        const targetNormalized = normalize(targetService);
        console.log('Normalized target:', targetNormalized);
        const service = (allServices as any[]).find(s => {
          const serviceNorm = normalize(s.name);
          return s.name === targetService || serviceNorm === targetNormalized || targetNormalized.includes(serviceNorm);
        });
        console.log('Found service:', service);

        if (service) {
          // If no doctor assigned yet, or current is '-', pick next
          if (!currentCustomer.assignedDoctor || currentCustomer.assignedDoctor === "" || currentCustomer.assignedDoctor === "-" || updatedPayload.assignedDoctor === "-") {
            const { results: serviceDoctors } = await c.env.DB.prepare(
              "SELECT id, doctorName, displayOrder FROM service_doctors WHERE serviceId = ? AND isActive = 1 ORDER BY displayOrder ASC, id ASC"
            ).bind(service.id).all();
            console.log('Service doctors found:', serviceDoctors);
            if (serviceDoctors.length > 0) {
              updatedPayload.assignedDoctor = (serviceDoctors[0] as any).doctorName;
              console.log('Assigned doctor:', updatedPayload.assignedDoctor);
            } else {
              console.log('No doctors found for service:', service.id);
            }
          } else {
            console.log('Doctor already assigned:', currentCustomer.assignedDoctor);
          }
        } else {
          console.log('Service not found for:', targetService);
        }

        // Rotate Doctor (if assigned now)
        const finalDoctor = updatedPayload.assignedDoctor || currentCustomer.assignedDoctor;
        if (service && finalDoctor && finalDoctor !== "-") {
          const { results: allDocMappings } = await c.env.DB.prepare(
            "SELECT id, serviceId FROM service_doctors WHERE doctorName = ? AND isActive = 1"
          ).bind(finalDoctor).all();

          for (const mapping of (allDocMappings as any[])) {
            const { results: siblingDoctors } = await c.env.DB.prepare(
              "SELECT id, displayOrder FROM service_doctors WHERE serviceId = ? AND isActive = 1 ORDER BY displayOrder ASC, id ASC"
            ).bind(mapping.serviceId).all();

            const reordered = (siblingDoctors as any[])
              .map(d => ({ ...d, displayOrder: d.id === mapping.id ? 9999 : d.displayOrder }))
              .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);

            for (let i = 0; i < reordered.length; i++) {
              await c.env.DB.prepare("UPDATE service_doctors SET displayOrder = ? WHERE id = ?").bind(i + 1, reordered[i].id).run();
            }
          }
        }
      }
    }

    // Case 2: SQL -> MQL (Undo assignment and move to front)
    if (body.lifecycleStage === 'MQL' && currentCustomer.lifecycleStage === 'SQL') {
      updatedPayload.assignedSales = "-";
      updatedPayload.assignedDoctor = "-";

      // Restore Sales to front
      if (currentCustomer.assignedSales && currentCustomer.assignedSales !== "-") {
        const { results: salesToRestore } = await c.env.DB.prepare(
          "SELECT id FROM users WHERE name = ? AND role = 'SALES' AND status = 'active'"
        ).bind(currentCustomer.assignedSales).all();

        if (salesToRestore.length > 0) {
          const sid = (salesToRestore[0] as any).id;
          const { results: allSales } = await c.env.DB.prepare(
            "SELECT id, queueOrder FROM users WHERE role = 'SALES' AND status = 'active' ORDER BY queueOrder ASC"
          ).all();

          const reordered = (allSales as any[])
            .map(u => ({ ...u, queueOrder: u.id === sid ? 0 : u.queueOrder }))
            .sort((a, b) => a.queueOrder - b.queueOrder);

          for (let i = 0; i < reordered.length; i++) {
            await c.env.DB.prepare("UPDATE users SET queueOrder = ? WHERE id = ?")
              .bind(i + 1, reordered[i].id).run();
          }
        }
      }

      // Restore Doctor to front in all services
      if (currentCustomer.assignedDoctor && currentCustomer.assignedDoctor !== "-") {
        const docName = currentCustomer.assignedDoctor;
        const { results: mappings } = await c.env.DB.prepare(
          "SELECT id, serviceId FROM service_doctors WHERE doctorName = ? AND isActive = 1"
        ).bind(docName).all();

        for (const m of (mappings as any[])) {
          const { results: siblings } = await c.env.DB.prepare(
            "SELECT id, displayOrder FROM service_doctors WHERE serviceId = ? AND isActive = 1 ORDER BY displayOrder ASC"
          ).bind(m.serviceId).all();

          const reordered = (siblings as any[])
            .map(d => ({ ...d, displayOrder: d.id === m.id ? 0 : d.displayOrder }))
            .sort((a, b) => a.displayOrder - b.displayOrder);

          for (let i = 0; i < reordered.length; i++) {
            await c.env.DB.prepare("UPDATE service_doctors SET displayOrder = ? WHERE id = ?")
              .bind(i + 1, reordered[i].id).run();
          }
        }
      }
    }

    // ============================================

    // Merge current data with updates (partial update support)
    let updatedCustomer = {
      customerId: updatedPayload.customerId !== undefined ? updatedPayload.customerId : currentCustomer.customerId,
      displayName: updatedPayload.displayName !== undefined ? updatedPayload.displayName : currentCustomer.displayName,
      phone: updatedPayload.phone !== undefined ? updatedPayload.phone : currentCustomer.phone,
      email: updatedPayload.email !== undefined ? updatedPayload.email : currentCustomer.email,
      platform: updatedPayload.platform !== undefined ? updatedPayload.platform : currentCustomer.platform,
      lineUid: updatedPayload.lineUid !== undefined ? updatedPayload.lineUid : currentCustomer.lineUid,
      lineId: updatedPayload.lineId !== undefined ? updatedPayload.lineId : currentCustomer.lineId,
      country: updatedPayload.country !== undefined ? updatedPayload.country : currentCustomer.country,
      source: updatedPayload.source !== undefined ? updatedPayload.source : currentCustomer.source,
      serviceInterest: updatedPayload.serviceInterest !== undefined ? updatedPayload.serviceInterest : currentCustomer.serviceInterest,
      lifecycleStage: updatedPayload.lifecycleStage !== undefined ? updatedPayload.lifecycleStage : currentCustomer.lifecycleStage,
      status: updatedPayload.status !== undefined ? updatedPayload.status : currentCustomer.status,
      reasonLost: updatedPayload.reasonLost !== undefined ? updatedPayload.reasonLost : currentCustomer.reasonLost,
      isUQL: updatedPayload.isUQL !== undefined ? (updatedPayload.isUQL || '') : (currentCustomer.isUQL || ''),
      isMQL: updatedPayload.isMQL !== undefined ? (updatedPayload.isMQL || '') : (currentCustomer.isMQL || ''),
      isSQL: updatedPayload.isSQL !== undefined ? (updatedPayload.isSQL || '') : (currentCustomer.isSQL || ''),
      mqlToSqlDays: updatedPayload.mqlToSqlDays !== undefined ? updatedPayload.mqlToSqlDays : currentCustomer.mqlToSqlDays,
      isCloseWon: updatedPayload.isCloseWon !== undefined ? (updatedPayload.isCloseWon ? 1 : 0) : currentCustomer.isCloseWon,
      closeWonMonth: updatedPayload.closeWonMonth !== undefined ? updatedPayload.closeWonMonth : currentCustomer.closeWonMonth,
      assignedSales: updatedPayload.assignedSales !== undefined ? updatedPayload.assignedSales : currentCustomer.assignedSales,
      assignedDoctor: updatedPayload.assignedDoctor !== undefined ? updatedPayload.assignedDoctor : currentCustomer.assignedDoctor,
      revenueWeight: updatedPayload.revenueWeight !== undefined ? updatedPayload.revenueWeight : currentCustomer.revenueWeight,
      isInactive: updatedPayload.isInactive !== undefined ? (updatedPayload.isInactive ? 1 : 0) : currentCustomer.isInactive,
      notes: updatedPayload.notes !== undefined ? updatedPayload.notes : currentCustomer.notes,
      remark: updatedPayload.remark !== undefined ? updatedPayload.remark : currentCustomer.remark,
      month: updatedPayload.month !== undefined ? updatedPayload.month : currentCustomer.month,
      createdAt: updatedPayload.createdAt !== undefined ? updatedPayload.createdAt : currentCustomer.createdAt,
    };

    const result = await c.env.DB.prepare(`
      UPDATE customers SET
        customerId = ?,
        displayName = ?, phone = ?, email = ?, platform = ?, lineUid = ?, lineId = ?,
        country = ?, source = ?, serviceInterest = ?, lifecycleStage = ?, status = ?,
        reasonLost = ?, isUQL = ?, isMQL = ?, isSQL = ?, mqlToSqlDays = ?,
        isCloseWon = ?, closeWonMonth = ?, assignedSales = ?, assignedDoctor = ?,
        revenueWeight = ?, isInactive = ?, notes = ?, remark = ?, month = ?, createdAt = ?, updatedAt = ?
      WHERE id = ?
    `).bind(
      updatedCustomer.customerId,
      updatedCustomer.displayName,
      updatedCustomer.phone,
      updatedCustomer.email,
      updatedCustomer.platform,
      updatedCustomer.lineUid || null,
      updatedCustomer.lineId || null,
      updatedCustomer.country || 'TH',
      updatedCustomer.source,
      updatedCustomer.serviceInterest || null,
      updatedCustomer.lifecycleStage,
      updatedCustomer.status,
      updatedCustomer.reasonLost || null,
      updatedCustomer.isUQL,
      updatedCustomer.isMQL,
      updatedCustomer.isSQL,
      updatedCustomer.mqlToSqlDays || null,
      updatedCustomer.isCloseWon,
      updatedCustomer.closeWonMonth || null,
      updatedCustomer.assignedSales || null,
      updatedCustomer.assignedDoctor || null,
      updatedCustomer.revenueWeight || '-',
      updatedCustomer.isInactive,
      updatedCustomer.notes || null,
      updatedCustomer.remark || null,
      updatedCustomer.month || null,
      updatedCustomer.createdAt,
      updatedAt,
      id
    ).run();

    // Return updated customer with proper type conversion
    const finalCustomer = {
      id: parseInt(id),
      ...updatedCustomer,
      isUQL: updatedCustomer.isUQL || '',
      isMQL: updatedCustomer.isMQL || '',
      isSQL: updatedCustomer.isSQL || '',
      isInactive: Boolean(updatedCustomer.isInactive),
      updatedAt
    };

    return c.json({ success: true, data: finalCustomer });
  } catch (error: any) {
    console.error('PUT /api/customers/:id error:', error);
    return c.json({ success: false, error: error.message || 'Database error' }, 500);
  }
});

// Delete customer
app.delete('/api/customers/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB.prepare(
      'DELETE FROM customers WHERE id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Customer not found' }, 404);
    }

    // Check if there are any customers left
    const { results } = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM customers'
    ).all();

    const count = (results[0] as any).count;

    // If no customers left, reset auto-increment
    if (count === 0) {
      await c.env.DB.prepare(
        "DELETE FROM sqlite_sequence WHERE name='customers'"
      ).run();
    }

    return c.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// USER MANAGEMENT API
// ============================================

// Login
app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    // Hash input to compare with DB
    const hashedPassword = await hashPassword(password);

    const { results } = await c.env.DB.prepare(
      'SELECT id, email, name, role, status FROM users WHERE email = ? AND password = ? AND status = "active"'
    ).bind(email, hashedPassword).all();

    if (results.length === 0) {
      return c.json({ success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ' }, 401);
    }

    const user = results[0] as any;

    // Generate JWT Token (Expires in 24h)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    };

    const token = await sign(payload, c.env.JWT_SECRET || 'your-default-secure-secret-key');

    return c.json({
      success: true,
      data: {
        token,
        user
      },
      message: 'Login successful'
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get all users
app.get('/api/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, email, password, name, role, phone, avatar, status, country, caseType, queueOrder, serviceInterests, createdAt, updatedAt FROM users ORDER BY role ASC, queueOrder ASC, id ASC'
    ).all();

    // Parse serviceInterests JSON string to array
    const usersWithParsedServices = results.map((user: any) => ({
      ...user,
      serviceIds: user.serviceInterests ? JSON.parse(user.serviceInterests) : [],
      serviceInterests: user.serviceInterests ? JSON.parse(user.serviceInterests) : [] // Add this for compatibility
    }));

    return c.json({ success: true, data: usersWithParsedServices });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get user by ID
app.get('/api/users/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const { results } = await c.env.DB.prepare(
      'SELECT id, email, password, name, role, phone, avatar, status, country, caseType, queueOrder, serviceInterests, createdAt, updatedAt FROM users WHERE id = ?'
    ).bind(id).all();

    if (results.length === 0) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const user: any = results[0];
    // Parse serviceInterests JSON string to array
    user.serviceIds = user.serviceInterests ? JSON.parse(user.serviceInterests) : [];
    user.serviceInterests = user.serviceIds; // Add this for compatibility

    return c.json({ success: true, data: user });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create new user
app.post('/api/users', async (c) => {
  try {
    const body = await c.req.json();
    const createdAt = new Date().toISOString();

    // Check if email already exists
    const { results: existingUsers } = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(body.email).all();

    if (existingUsers.length > 0) {
      return c.json({ success: false, error: 'Email already exists' }, 400);
    }

    // Convert serviceIds array to JSON string
    const serviceInterestsJson = body.serviceIds ? JSON.stringify(body.serviceIds) : null;

    // Hash password before saving
    const hashedPassword = await hashPassword(body.password);

    const result = await c.env.DB.prepare(`
      INSERT INTO users (email, password, name, role, phone, avatar, status, country, caseType, queueOrder, serviceInterests, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.email,
      hashedPassword,
      body.name,
      body.role,
      body.phone || null,
      body.avatar || null,
      body.status || 'active',
      body.country || null,
      body.caseType || null,
      body.queueOrder !== undefined ? body.queueOrder : 1,
      serviceInterestsJson,
      createdAt,
      createdAt
    ).run();

    const newUserId = result.meta.last_row_id;

    // Sync Service Doctors (If Role is Doctor)
    if (body.role === 'DOCTOR' && body.serviceIds && body.serviceIds.length > 0) {
      for (const sid of body.serviceIds) {
        // Get max order
        const { results: maxOrderResult } = await c.env.DB.prepare(
          'SELECT MAX(displayOrder) as maxOrder FROM service_doctors WHERE serviceId = ?'
        ).bind(sid).all();
        const nextOrder = ((maxOrderResult[0] as any).maxOrder || 0) + 1;

        await c.env.DB.prepare(`
           INSERT INTO service_doctors (serviceId, doctorName, country, displayOrder, isActive, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          sid,
          body.name,
          body.country || 'TH',
          nextOrder,
          1, // Active by default
          createdAt,
          createdAt
        ).run();
      }
    }

    return c.json({
      success: true,
      data: {
        id: newUserId,
        email: body.email,
        password: body.password,
        name: body.name,
        role: body.role,
        status: body.status || 'active',
        country: body.country || null,
        caseType: body.caseType || null,
        queueOrder: body.queueOrder || 1,
        serviceIds: body.serviceIds || [],
        createdAt: createdAt,
        updatedAt: createdAt
      }
    }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update user
app.put('/api/users/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const updatedAt = new Date().toISOString();

    // Get current user data
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(id).all();

    if (results.length === 0) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const currentUser = results[0] as any;

    // Convert serviceIds array to JSON string
    const serviceInterestsJson = body.serviceIds !== undefined
      ? JSON.stringify(body.serviceIds)
      : currentUser.serviceInterests;

    // Merge current data with updates
    const updatedUser: any = {
      email: body.email !== undefined ? body.email : currentUser.email,
      password: body.password !== undefined ? body.password : currentUser.password,
      name: body.name !== undefined ? body.name : currentUser.name,
      role: body.role !== undefined ? body.role : currentUser.role,
      phone: body.phone !== undefined ? body.phone : currentUser.phone,
      avatar: body.avatar !== undefined ? body.avatar : currentUser.avatar,
      status: body.status !== undefined ? body.status : currentUser.status,
      country: body.country !== undefined ? body.country : currentUser.country,
      caseType: body.caseType !== undefined ? body.caseType : currentUser.caseType,
      queueOrder: body.queueOrder !== undefined ? body.queueOrder : currentUser.queueOrder,
      serviceInterests: serviceInterestsJson,
    };

    // Logic: If status changes to 'active', assign next queueOrder (Clock-in logic)
    if (body.status === 'active' && currentUser.status !== 'active') {
      const { results: maxOrderResult } = await c.env.DB.prepare(
        "SELECT MAX(queueOrder) as maxOrder FROM users"
      ).all();
      const currentMax = (maxOrderResult[0] as any).maxOrder || 0;
      updatedUser.queueOrder = currentMax + 1;
    }

    // Hash password if updating
    let finalPassword = updatedUser.password;
    if (body.password) {
      finalPassword = await hashPassword(body.password);
    }

    await c.env.DB.prepare(`
      UPDATE users SET
        email = ?, password = ?, name = ?, role = ?, phone = ?, avatar = ?, status = ?, country = ?, caseType = ?, queueOrder = ?, serviceInterests = ?, updatedAt = ?
      WHERE id = ?
    `).bind(
      updatedUser.email,
      finalPassword,
      updatedUser.name,
      updatedUser.role,
      updatedUser.phone || null,
      updatedUser.avatar || null,
      updatedUser.status,
      updatedUser.country || null,
      updatedUser.caseType || null,
      updatedUser.queueOrder || 1,
      updatedUser.serviceInterests || null,
      updatedAt,
      id
    ).run();

    // Sync Service Doctors (If Role is Doctor)
    if (updatedUser.role === 'DOCTOR') {
      const oldName = currentUser.name;
      const newName = updatedUser.name;

      // 1. Handle Name Change
      if (oldName !== newName) {
        await c.env.DB.prepare(
          'UPDATE service_doctors SET doctorName = ? WHERE doctorName = ?'
        ).bind(newName, oldName).run();
      }

      // 2. Sync Services
      if (body.serviceIds !== undefined) {
        const newServiceIds = body.serviceIds as number[];

        // Get current services from DB
        const { results: currentServices } = await c.env.DB.prepare(
          'SELECT serviceId FROM service_doctors WHERE doctorName = ?'
        ).bind(newName).all();
        const currentServiceIds = currentServices.map((r: any) => r.serviceId);

        // Calculate diff
        const toAdd = newServiceIds.filter(id => !currentServiceIds.includes(id));
        const toRemove = currentServiceIds.filter(id => !newServiceIds.includes(id));

        // Remove
        if (toRemove.length > 0) {
          for (const sid of toRemove) {
            await c.env.DB.prepare(
              'DELETE FROM service_doctors WHERE doctorName = ? AND serviceId = ?'
            ).bind(newName, sid).run();
          }
        }

        // Add
        if (toAdd.length > 0) {
          for (const sid of toAdd) {
            // Get max order
            const { results: maxOrderResult } = await c.env.DB.prepare(
              'SELECT MAX(displayOrder) as maxOrder FROM service_doctors WHERE serviceId = ?'
            ).bind(sid).all();
            const nextOrder = ((maxOrderResult[0] as any).maxOrder || 0) + 1;

            await c.env.DB.prepare(`
               INSERT INTO service_doctors (serviceId, doctorName, country, displayOrder, isActive, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
              sid,
              newName,
              updatedUser.country || 'TH',
              nextOrder,
              1, // Active by default
              updatedAt,
              updatedAt
            ).run();
          }
        }
      }
    }

    // Return updated user with password
    const { serviceInterests, ...userWithoutServiceInterests } = updatedUser;

    return c.json({
      success: true,
      data: {
        id: id,
        ...userWithoutServiceInterests,
        serviceIds: serviceInterests ? JSON.parse(serviceInterests) : [],
        updatedAt
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete user
app.delete('/api/users/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const result = await c.env.DB.prepare(
      'DELETE FROM users WHERE id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// REPORTS API
// ============================================

// Helper constants and utilities
const getMonthNames = () => {
  const months = [];
  for (let i = 0; i < 12; i++) {
    months.push(new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'short' }).toUpperCase());
  }
  return months;
};

const MONTH_NAMES = getMonthNames();

// Standard API response format
const createApiResponse = (data: any, success = true, message?: string, meta?: any) => {
  const response: any = { success, data };
  if (message) response.message = message;
  if (meta) response.meta = meta;
  return response;
};

const parseDateFilters = (year?: string, month?: string, sales?: string, country?: string) => {
  const filters: string[] = [];
  const bindings: any[] = [];

  if (year) {
    filters.push("strftime('%Y', createdAt) = ?");
    bindings.push(year);
  }

  if (month && month !== 'all') {
    filters.push("CAST(strftime('%m', createdAt) AS INTEGER) = ?");
    bindings.push(parseInt(month)); // แก้ไข: แปลง string เป็น number
  }

  if (sales && sales !== 'all') {
    filters.push("assignedSales = ?");
    bindings.push(sales);
  }

  if (country && country !== 'all') {
    filters.push("country = ?");
    bindings.push(country);
  }

  return { filters, bindings };
};

// Helper function to parse pagination
const parsePagination = (page?: string, limit?: string) => {
  const pageNum = parseInt(page || '1');
  const limitNum = parseInt(limit || '50');
  const offset = (pageNum - 1) * limitNum;

  return {
    page: pageNum,
    limit: limitNum,
    offset: offset
  };
};

// Report 1: SQL by Sales
app.get('/api/reports/sql-by-sales', async (c) => {
  try {
    const year = c.req.query('year');
    const month = c.req.query('month');
    const sales = c.req.query('sales');
    const country = c.req.query('country');

    const { filters, bindings } = parseDateFilters(year, month, sales, country);
    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    const { results } = await c.env.DB.prepare(`
      SELECT 
        assignedSales as name,
        COUNT(*) as SQL
      FROM customers
      WHERE isSQL = 1 ${whereClause}
      GROUP BY assignedSales
      ORDER BY SQL DESC
    `).bind(...bindings).all();

    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Report 2: Leads by Type (SQL, MQL, UQL)
// NOTE: SQL ต้องนับรวมเป็น MQL ตาม requirement
app.get('/api/reports/leads-by-type', async (c) => {
  try {
    const year = c.req.query('year');
    const month = c.req.query('month');
    const sales = c.req.query('sales');
    const country = c.req.query('country');

    const { filters, bindings } = parseDateFilters(year, month, sales, country);
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const { results } = await c.env.DB.prepare(`
      SELECT 
        SUM(CASE WHEN lifecycleStage = 'SQL' THEN 1 ELSE 0 END) as SQL,
        SUM(CASE WHEN lifecycleStage = 'MQL' OR lifecycleStage = 'SQL' THEN 1 ELSE 0 END) as MQL,
        SUM(CASE WHEN lifecycleStage = 'UQL' THEN 1 ELSE 0 END) as UQL
      FROM customers
      ${whereClause}
    `).bind(...bindings).all();

    const data = results[0] as any;
    return c.json({
      success: true,
      data: [
        { name: 'SQL', value: data.SQL || 0 },
        { name: 'MQL', value: data.MQL || 0 },
        { name: 'UQL', value: data.UQL || 0 }
      ]
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Report 3: Status by Sales
app.get('/api/reports/status-by-sales', async (c) => {
  try {
    const year = c.req.query('year');
    const month = c.req.query('month');
    const sales = c.req.query('sales');
    const country = c.req.query('country');

    const { filters, bindings } = parseDateFilters(year, month, sales, country);
    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    const { results } = await c.env.DB.prepare(`
      SELECT 
        assignedSales as name,
        COUNT(*) as SQL,
        SUM(CASE WHEN status = 'Contact' THEN 1 ELSE 0 END) as Contact,
        SUM(CASE WHEN status = 'Consulted' THEN 1 ELSE 0 END) as Consulted,
        SUM(CASE WHEN status LIKE 'Close Won%' THEN 1 ELSE 0 END) as CloseWon,
        SUM(CASE WHEN status LIKE 'Close Lost%' THEN 1 ELSE 0 END) as CloseLost
      FROM customers
      WHERE isSQL = 1 ${whereClause}
      GROUP BY assignedSales
      ORDER BY SQL DESC
    `).bind(...bindings).all();

    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Report 4: SQL by Channel (Platform)
app.get('/api/reports/sql-by-channel', async (c) => {
  try {
    const year = c.req.query('year');
    const month = c.req.query('month');
    const sales = c.req.query('sales');
    const country = c.req.query('country');

    const { filters, bindings } = parseDateFilters(year, month, sales, country);
    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    const { results } = await c.env.DB.prepare(`
      SELECT 
        platform as name,
        COUNT(*) as SQL
      FROM customers
      WHERE isSQL = 1 ${whereClause}
      GROUP BY platform
      ORDER BY SQL DESC
    `).bind(...bindings).all();

    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Report 5: Close Won by Channel
app.get('/api/reports/close-won-by-channel', async (c) => {
  try {
    const year = c.req.query('year');
    const month = c.req.query('month');
    const sales = c.req.query('sales');
    const country = c.req.query('country');

    const { filters, bindings } = parseDateFilters(year, month, sales, country);
    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    const { results } = await c.env.DB.prepare(`
      SELECT 
        platform as name,
        COUNT(*) as CloseWon
      FROM customers
      WHERE isCloseWon = 1 ${whereClause}
      GROUP BY platform
      ORDER BY CloseWon DESC
    `).bind(...bindings).all();

    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Report 6: Leads Channel by Sales (Pivot table)
app.get('/api/reports/leads-channel-by-sales', async (c) => {
  try {
    const year = c.req.query('year');
    const month = c.req.query('month');
    const sales = c.req.query('sales');
    const country = c.req.query('country');
    const page = c.req.query('page');
    const limit = c.req.query('limit');

    const { filters, bindings } = parseDateFilters(year, month, sales, country);
    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    // Get total count for pagination
    const { results: countResults } = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT assignedSales) as total
      FROM customers
      WHERE isSQL = 1 ${whereClause}
    `).bind(...bindings).all();

    const totalSales = (countResults[0] as any)?.total || 0;

    // Get paginated data
    const pagination = parsePagination(page, limit);

    const { results } = await c.env.DB.prepare(`
      SELECT 
        assignedSales as sales,
        platform,
        COUNT(*) as count
      FROM customers
      WHERE isSQL = 1 ${whereClause}
      GROUP BY assignedSales, platform
      ORDER BY assignedSales, count DESC
    `).bind(...bindings).all();

    // Transform to pivot format
    const platforms = new Set<string>();
    const salesMap = new Map<string, any>();

    (results as any[]).forEach(row => {
      platforms.add(row.platform);
      if (!salesMap.has(row.sales)) {
        salesMap.set(row.sales, { sales: row.sales });
      }
      salesMap.get(row.sales)![row.platform] = row.count;
    });

    const allData = Array.from(salesMap.values()).map(row => {
      let total = 0;
      Array.from(platforms).forEach(p => {
        if (!row[p]) row[p] = 0;
        total += row[p];
      });
      row.total = total;
      return row;
    }).sort((a, b) => b.total - a.total);

    // Apply pagination to data
    const paginatedData = allData.slice(pagination.offset, pagination.offset + pagination.limit);

    return c.json({
      success: true,
      data: {
        platforms: Array.from(platforms).sort(),
        data: paginatedData
      },
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: allData.length,
        totalPages: Math.ceil(allData.length / pagination.limit)
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Report 7: MQL by Channel + Source
// NOTE: SQL ต้องนับรวมเป็น MQL ตาม requirement
app.get('/api/reports/mql-by-channel', async (c) => {
  try {
    const year = c.req.query('year');
    const month = c.req.query('month');
    const sales = c.req.query('sales');
    const country = c.req.query('country');
    const page = c.req.query('page');
    const limit = c.req.query('limit');

    const { filters, bindings } = parseDateFilters(year, month, sales, country);
    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    const { results } = await c.env.DB.prepare(`
      SELECT 
        platform,
        source,
        COUNT(*) as MQL
      FROM customers
      WHERE (isMQL = 1 OR isSQL = 1) ${whereClause}
      GROUP BY platform, source
      ORDER BY platform, MQL DESC
    `).bind(...bindings).all();

    // Transform to hierarchical format
    const platformMap = new Map<string, any[]>();

    (results as any[]).forEach(row => {
      if (!platformMap.has(row.platform)) {
        platformMap.set(row.platform, []);
      }
      platformMap.get(row.platform)!.push({
        source: row.source,
        MQL: row.MQL
      });
    });

    // Build hierarchical data
    const allData: any[] = [];
    const platformTotals = Array.from(platformMap.entries()).map(([platform, sources]) => {
      const total = sources.reduce((sum, s) => sum + s.MQL, 0);
      return { platform, total, sources };
    }).sort((a, b) => b.total - a.total);

    platformTotals.forEach(({ platform, total, sources }) => {
      // Add platform total row
      allData.push({ platform, source: '', MQL: total, isSubRow: false });

      // Add source breakdown rows
      sources.forEach((s: any) => {
        allData.push({ platform: '', source: s.source, MQL: s.MQL, isSubRow: true });
      });
    });

    // Apply pagination
    const pagination = parsePagination(page, limit);
    const paginatedData = allData.slice(pagination.offset, pagination.offset + pagination.limit);

    return c.json({
      success: true,
      data: paginatedData,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: allData.length,
        totalPages: Math.ceil(allData.length / pagination.limit)
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Monthly Reports - SQL by Sales (per month)
app.get('/api/reports/sql-by-sales-monthly', async (c) => {
  try {
    const year = c.req.query('year') || new Date().getFullYear().toString();
    const sales = c.req.query('sales');
    const country = c.req.query('country');

    const salesFilter = sales && sales !== 'all' ? 'AND assignedSales = ?' : '';
    const countryFilter = country && country !== 'all' ? 'AND country = ?' : '';

    const bindings = [year];
    if (sales && sales !== 'all') bindings.push(sales);
    if (country && country !== 'all') bindings.push(country);

    const { results } = await c.env.DB.prepare(`
      SELECT 
        assignedSales as name,
        CAST(strftime('%m', createdAt) AS INTEGER) as month,
        COUNT(*) as count
      FROM customers
      WHERE isSQL = 1 
        AND strftime('%Y', createdAt) = ?
        ${salesFilter}
        ${countryFilter}
      GROUP BY assignedSales, month
      ORDER BY assignedSales, month
    `).bind(...bindings).all();

    // Transform to monthly format
    const salesMap = new Map<string, number[]>();

    (results as any[]).forEach(row => {
      if (!salesMap.has(row.name)) {
        salesMap.set(row.name, new Array(12).fill(0));
      }
      salesMap.get(row.name)![row.month - 1] = row.count;
    });

    const data = Array.from(salesMap.entries()).map(([name, months]) => {
      const row: any = { name };
      let total = 0;
      months.forEach((count, idx) => {
        row[MONTH_NAMES[idx]] = count;
        total += count;
      });
      row.total = total;
      return row;
    }).sort((a, b) => b.total - a.total);

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Monthly Reports - Leads by Type (per month)
app.get('/api/reports/leads-by-type-monthly', async (c) => {
  try {
    const year = c.req.query('year') || new Date().getFullYear().toString();
    const sales = c.req.query('sales');
    const country = c.req.query('country');

    const salesFilter = sales && sales !== 'all' ? 'AND assignedSales = ?' : '';
    const countryFilter = country && country !== 'all' ? 'AND country = ?' : '';

    const bindings = [year];
    if (sales && sales !== 'all') bindings.push(sales);
    if (country && country !== 'all') bindings.push(country);

    const { results } = await c.env.DB.prepare(`
      SELECT 
        CAST(strftime('%m', createdAt) AS INTEGER) as month,
        SUM(CASE WHEN lifecycleStage = 'SQL' THEN 1 ELSE 0 END) as SQL,
        SUM(CASE WHEN lifecycleStage = 'MQL' OR lifecycleStage = 'SQL' THEN 1 ELSE 0 END) as MQL,
        SUM(CASE WHEN lifecycleStage = 'UQL' THEN 1 ELSE 0 END) as UQL
      FROM customers
      WHERE strftime('%Y', createdAt) = ?
        ${salesFilter}
        ${countryFilter}
      GROUP BY month
      ORDER BY month
    `).bind(...bindings).all();

    const typeMap = new Map<string, number[]>();
    typeMap.set('SQL', new Array(12).fill(0));
    typeMap.set('MQL', new Array(12).fill(0));
    typeMap.set('UQL', new Array(12).fill(0));

    (results as any[]).forEach(row => {
      typeMap.get('SQL')![row.month - 1] = row.SQL || 0;
      typeMap.get('MQL')![row.month - 1] = row.MQL || 0;
      typeMap.get('UQL')![row.month - 1] = row.UQL || 0;
    });

    const data = Array.from(typeMap.entries()).map(([name, months]) => {
      const row: any = { name };
      let total = 0;
      months.forEach((count, idx) => {
        row[MONTH_NAMES[idx]] = count;
        total += count;
      });
      row.total = total;
      return row;
    });

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Monthly Reports - Status by Sales (per month)
app.get('/api/reports/status-by-sales-monthly', async (c) => {
  try {
    const year = c.req.query('year') || new Date().getFullYear().toString();
    const sales = c.req.query('sales');
    const country = c.req.query('country');

    const salesFilter = sales && sales !== 'all' ? 'AND assignedSales = ?' : '';
    const countryFilter = country && country !== 'all' ? 'AND country = ?' : '';

    const bindings = [year];
    if (sales && sales !== 'all') bindings.push(sales);
    if (country && country !== 'all') bindings.push(country);

    const { results } = await c.env.DB.prepare(`
      SELECT 
        assignedSales as name,
        CAST(strftime('%m', createdAt) AS INTEGER) as month,
        COUNT(*) as SQL,
        SUM(CASE WHEN status = 'Contact' THEN 1 ELSE 0 END) as Contact,
        SUM(CASE WHEN status = 'Consulted' THEN 1 ELSE 0 END) as Consulted,
        SUM(CASE WHEN status LIKE 'Close Won%' THEN 1 ELSE 0 END) as CloseWon,
        SUM(CASE WHEN status LIKE 'Close Lost%' THEN 1 ELSE 0 END) as CloseLost
      FROM customers
      WHERE isSQL = 1 
        AND strftime('%Y', createdAt) = ?
        ${salesFilter}
        ${countryFilter}
      GROUP BY assignedSales, month
      ORDER BY assignedSales, month
    `).bind(...bindings).all();

    // Transform to monthly format
    const salesMap = new Map<string, any>();

    (results as any[]).forEach(row => {
      if (!salesMap.has(row.name)) {
        salesMap.set(row.name, {
          SQL: new Array(12).fill(0),
          Contact: new Array(12).fill(0),
          Consulted: new Array(12).fill(0),
          CloseWon: new Array(12).fill(0),
          CloseLost: new Array(12).fill(0),
        });
      }
      const data = salesMap.get(row.name)!;
      data.SQL[row.month - 1] = row.SQL;
      data.Contact[row.month - 1] = row.Contact;
      data.Consulted[row.month - 1] = row.Consulted;
      data.CloseWon[row.month - 1] = row.CloseWon;
      data.CloseLost[row.month - 1] = row.CloseLost;
    });

    const data = Array.from(salesMap.entries()).map(([name, months]) => ({
      name,
      ...months
    }));

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Monthly Reports - SQL by Channel (per month)
app.get('/api/reports/sql-by-channel-monthly', async (c) => {
  try {
    const year = c.req.query('year') || new Date().getFullYear().toString();
    const sales = c.req.query('sales');
    const country = c.req.query('country');

    const salesFilter = sales && sales !== 'all' ? 'AND assignedSales = ?' : '';
    const countryFilter = country && country !== 'all' ? 'AND country = ?' : '';

    const bindings = [year];
    if (sales && sales !== 'all') bindings.push(sales);
    if (country && country !== 'all') bindings.push(country);

    const { results } = await c.env.DB.prepare(`
      SELECT 
        platform as name,
        CAST(strftime('%m', createdAt) AS INTEGER) as month,
        COUNT(*) as count
      FROM customers
      WHERE isSQL = 1 
        AND strftime('%Y', createdAt) = ?
        ${salesFilter}
        ${countryFilter}
      GROUP BY platform, month
      ORDER BY platform, month
    `).bind(...bindings).all();


    // Transform to monthly format
    const platformMap = new Map<string, number[]>();

    (results as any[]).forEach(row => {
      if (!platformMap.has(row.name)) {
        platformMap.set(row.name, new Array(12).fill(0));
      }
      platformMap.get(row.name)![row.month - 1] = row.count;
    });

    const data = Array.from(platformMap.entries()).map(([name, months]) => {
      const row: any = { name };
      let total = 0;
      months.forEach((count, idx) => {
        row[MONTH_NAMES[idx]] = count;
        total += count;
      });
      row.total = total;
      return row;
    }).sort((a, b) => b.total - a.total);

    // Calculate grand total per month
    const grandTotal: any = { name: 'Grand Total' };
    let grandTotalSum = 0;
    MONTH_NAMES.forEach(month => {
      const sum = data.reduce((acc, row) => acc + (row[month] || 0), 0);
      grandTotal[month] = sum;
      grandTotalSum += sum;
    });
    grandTotal.total = grandTotalSum;

    return c.json(createApiResponse({ data, grandTotal }));
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Monthly Reports - Close Won by Channel (per month)
app.get('/api/reports/close-won-by-channel-monthly', async (c) => {
  try {
    const year = c.req.query('year') || new Date().getFullYear().toString();
    const sales = c.req.query('sales');

    const salesFilter = sales && sales !== 'all' ? 'AND assignedSales = ?' : '';
    const bindings = sales && sales !== 'all' ? [year, sales] : [year];

    const { results } = await c.env.DB.prepare(`
      SELECT 
        platform as name,
        CAST(strftime('%m', createdAt) AS INTEGER) as month,
        COUNT(*) as count
      FROM customers
      WHERE isCloseWon = 1 
        AND strftime('%Y', createdAt) = ?
        ${salesFilter}
      GROUP BY platform, month
      ORDER BY platform, month
    `).bind(...bindings).all();


    // Transform to monthly format
    const platformMap = new Map<string, number[]>();

    (results as any[]).forEach(row => {
      if (!platformMap.has(row.name)) {
        platformMap.set(row.name, new Array(12).fill(0));
      }
      platformMap.get(row.name)![row.month - 1] = row.count;
    });

    const data = Array.from(platformMap.entries()).map(([name, months]) => {
      const row: any = { name };
      let total = 0;
      months.forEach((count, idx) => {
        row[MONTH_NAMES[idx]] = count;
        total += count;
      });
      row.total = total;
      return row;
    }).sort((a, b) => b.total - a.total);

    // Calculate grand total per month
    const grandTotal: any = { name: 'Grand Total' };
    let grandTotalSum = 0;
    MONTH_NAMES.forEach(month => {
      const sum = data.reduce((acc, row) => acc + (row[month] || 0), 0);
      grandTotal[month] = sum;
      grandTotalSum += sum;
    });
    grandTotal.total = grandTotalSum;

    return c.json(createApiResponse({ data, grandTotal }));
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Monthly Reports - MQL by Channel (per month)
app.get('/api/reports/mql-by-channel-monthly', async (c) => {
  try {
    const year = c.req.query('year') || new Date().getFullYear().toString();
    const sales = c.req.query('sales');

    const salesFilter = sales && sales !== 'all' ? 'AND assignedSales = ?' : '';
    const bindings = sales && sales !== 'all' ? [year, sales] : [year];

    const { results } = await c.env.DB.prepare(`
      SELECT 
        platform as name,
        CAST(strftime('%m', createdAt) AS INTEGER) as month,
        COUNT(*) as count
      FROM customers
      WHERE (isMQL = 1 OR isSQL = 1)
        AND strftime('%Y', createdAt) = ?
        ${salesFilter}
      GROUP BY platform, month
      ORDER BY platform, month
    `).bind(...bindings).all();


    // Transform to monthly format
    const platformMap = new Map<string, number[]>();

    (results as any[]).forEach(row => {
      if (!platformMap.has(row.name)) {
        platformMap.set(row.name, new Array(12).fill(0));
      }
      platformMap.get(row.name)![row.month - 1] = row.count;
    });

    const data = Array.from(platformMap.entries()).map(([name, months]) => {
      const row: any = { name };
      let total = 0;
      months.forEach((count, idx) => {
        row[MONTH_NAMES[idx]] = count;
        total += count;
      });
      row.total = total;
      return row;
    }).sort((a, b) => b.total - a.total);

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Monthly Reports - Leads Channel by Sales (per month)
app.get('/api/reports/leads-channel-by-sales-monthly', async (c) => {
  try {
    const year = c.req.query('year') || new Date().getFullYear().toString();
    const sales = c.req.query('sales');

    const salesFilter = sales && sales !== 'all' ? 'AND assignedSales = ?' : '';
    const bindings = sales && sales !== 'all' ? [year, sales] : [year];

    const { results } = await c.env.DB.prepare(`
      SELECT 
        assignedSales as sales,
        CAST(strftime('%m', createdAt) AS INTEGER) as month,
        COUNT(*) as count
      FROM customers
      WHERE isSQL = 1 
        AND strftime('%Y', createdAt) = ?
        ${salesFilter}
      GROUP BY assignedSales, month
      ORDER BY assignedSales, month
    `).bind(...bindings).all();


    // Get unique sales list
    const salesList = Array.from(new Set((results as any[]).map(r => r.sales)));

    // Transform to monthly format
    const salesMonthMap = new Map<string, number[]>();

    (results as any[]).forEach(row => {
      if (!salesMonthMap.has(row.sales)) {
        salesMonthMap.set(row.sales, new Array(12).fill(0));
      }
      salesMonthMap.get(row.sales)![row.month - 1] = row.count;
    });

    // Create monthly data
    const monthlyData = MONTH_NAMES.map((monthName, monthIdx) => {
      const monthData: any = { month: monthName };
      let monthTotal = 0;

      salesList.forEach(sales => {
        const count = salesMonthMap.get(sales)?.[monthIdx] || 0;
        monthData[sales] = count;
        monthTotal += count;
      });

      monthData.total = monthTotal;
      return monthData;
    });

    return c.json({
      success: true,
      data: {
        platforms: [], // Not used in this report
        salesList,
        monthlyData
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// SERVICES MANAGEMENT API
// ============================================

// Get all services
app.get('/api/services', async (c) => {
  try {
    const activeOnly = c.req.query('activeOnly') === 'true';
    const category = c.req.query('category'); // 'Surgery' | 'Non-Surgery'

    let query = 'SELECT * FROM services';
    const conditions: string[] = [];
    const bindings: any[] = [];

    if (activeOnly) {
      conditions.push('isActive = ?');
      bindings.push(1);
    }

    if (category) {
      conditions.push('category = ?');
      bindings.push(category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY displayOrder ASC';

    const { results: servicesResults } = await c.env.DB.prepare(query).bind(...bindings).all();

    // Fetch all doctor mappings to avoid N+1
    const { results: mappingsResults } = await c.env.DB.prepare(
      'SELECT * FROM service_doctors WHERE isActive = 1 ORDER BY displayOrder ASC'
    ).all();

    // Group mappings by serviceId
    const mappingsByService = new Map<number, any[]>();
    mappingsResults.forEach((mapping: any) => {
      if (!mappingsByService.has(mapping.serviceId)) {
        mappingsByService.set(mapping.serviceId, []);
      }
      mappingsByService.get(mapping.serviceId)!.push(mapping);
    });

    // Merge and format
    const services = servicesResults.map((row: any) => ({
      ...row,
      isManualSelection: Boolean(row.isManualSelection),
      isActive: Boolean(row.isActive),
      doctors: (mappingsByService.get(row.id) || []).map(m => m.doctorName)
    }));

    return c.json({ success: true, data: services });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get service by ID
app.get('/api/services/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM services WHERE id = ?'
    ).bind(id).all();

    if (results.length === 0) {
      return c.json({ success: false, error: 'Service not found' }, 404);
    }

    const service = results[0] as any;
    const formattedService = {
      ...service,
      isManualSelection: Boolean(service.isManualSelection),
      isActive: Boolean(service.isActive),
    };

    return c.json({ success: true, data: formattedService });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create new service
app.post('/api/services', async (c) => {
  try {
    const body = await c.req.json();
    const now = new Date().toISOString();

    // Validate required fields
    if (!body.code || !body.name || !body.category) {
      return c.json({
        success: false,
        error: 'Missing required fields: code, name, category'
      }, 400);
    }

    // Check if code already exists
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id FROM services WHERE code = ?'
    ).bind(body.code).all();

    if (existing.length > 0) {
      return c.json({
        success: false,
        error: 'Service code already exists'
      }, 400);
    }

    // Auto-assign displayOrder if not provided
    let displayOrder = body.displayOrder;
    if (!displayOrder) {
      // Get max displayOrder for the category
      const { results: maxOrder } = await c.env.DB.prepare(
        'SELECT MAX(displayOrder) as maxOrder FROM services WHERE category = ?'
      ).bind(body.category).all();

      const currentMax = (maxOrder[0]?.maxOrder as number) || 0;
      displayOrder = currentMax + 1;
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO services (
        code, name, fullName, category, isManualSelection, 
        isActive, displayOrder, description, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.code,
      body.name,
      body.name, // Use name as fullName
      body.category,
      body.isManualSelection ? 1 : 0,
      body.isActive !== undefined ? (body.isActive ? 1 : 0) : 1,
      displayOrder,
      body.description || null,
      now,
      now
    ).run();

    return c.json({
      success: true,
      data: {
        id: result.meta.last_row_id,
        ...body,
        displayOrder,
        createdAt: now,
        updatedAt: now
      }
    }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update service
app.put('/api/services/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = new Date().toISOString();

    // Check if service exists
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM services WHERE id = ?'
    ).bind(id).all();

    if (results.length === 0) {
      return c.json({ success: false, error: 'Service not found' }, 404);
    }

    const current = results[0] as any;

    // Merge with existing data
    const updated = {
      code: body.code !== undefined ? body.code : current.code,
      name: body.name !== undefined ? body.name : current.name,
      fullName: body.name !== undefined ? body.name : current.fullName,
      category: body.category !== undefined ? body.category : current.category,
      isManualSelection: body.isManualSelection !== undefined ? (body.isManualSelection ? 1 : 0) : current.isManualSelection,
      isActive: body.isActive !== undefined ? (body.isActive ? 1 : 0) : current.isActive,
      displayOrder: body.displayOrder !== undefined ? body.displayOrder : current.displayOrder,
      description: body.description !== undefined ? body.description : current.description,
    };

    await c.env.DB.prepare(`
      UPDATE services SET
        code = ?, name = ?, fullName = ?, category = ?,
        isManualSelection = ?, isActive = ?, displayOrder = ?,
        description = ?, updatedAt = ?
      WHERE id = ?
    `).bind(
      updated.code,
      updated.name,
      updated.fullName,
      updated.category,
      updated.isManualSelection,
      updated.isActive,
      updated.displayOrder,
      updated.description,
      now,
      id
    ).run();

    return c.json({
      success: true,
      data: {
        id: parseInt(id),
        ...updated,
        isManualSelection: Boolean(updated.isManualSelection),
        isActive: Boolean(updated.isActive),
        updatedAt: now
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete service
app.delete('/api/services/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // Check if service exists
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM services WHERE id = ?'
    ).bind(id).all();

    if (results.length === 0) {
      return c.json({ success: false, error: 'Service not found' }, 404);
    }

    // Delete service (will cascade delete service_doctors due to FK constraint)
    await c.env.DB.prepare('DELETE FROM services WHERE id = ?').bind(id).run();

    return c.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// SERVICE-DOCTOR MAPPING API
// ============================================

// Get doctors for a service
app.get('/api/services/:id/doctors', async (c) => {
  try {
    const serviceId = c.req.param('id');
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM service_doctors 
      WHERE serviceId = ? 
      ORDER BY displayOrder ASC
    `).bind(serviceId).all();

    const doctors = results.map((row: any) => ({
      ...row,
      isActive: Boolean(row.isActive)
    }));

    return c.json({ success: true, data: doctors });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Add doctor to service
app.post('/api/services/:id/doctors', async (c) => {
  try {
    const serviceId = c.req.param('id');
    const body = await c.req.json();
    const now = new Date().toISOString();

    if (!body.doctorName || !body.country) {
      return c.json({ success: false, error: 'Missing doctorName or country' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO service_doctors (
        serviceId, doctorName, country, displayOrder, isActive, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      serviceId,
      body.doctorName,
      body.country,
      body.displayOrder || 1,
      body.isActive !== undefined ? (body.isActive ? 1 : 0) : 1,
      now,
      now
    ).run();

    // Sync to User (serviceInterests)
    const doctorNameTrimmed = String(body.doctorName).trim();
    const { results: users } = await c.env.DB.prepare(
      'SELECT * FROM users WHERE LOWER(name) = LOWER(?)' // Case insensitive match
    ).bind(doctorNameTrimmed).all();

    if (users.length > 0) {
      const user = users[0] as any;
      let interests = user.serviceInterests ? JSON.parse(user.serviceInterests) : [];
      const sid = parseInt(serviceId);
      if (!interests.includes(sid)) {
        interests.push(sid);
        await c.env.DB.prepare(
          'UPDATE users SET serviceInterests = ? WHERE id = ?'
        ).bind(JSON.stringify(interests), user.id).run();
      }
    }

    return c.json({
      success: true,
      data: { id: result.meta.last_row_id, serviceId, ...body, createdAt: now, updatedAt: now }
    }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update service-doctor mapping
app.put('/api/services/:serviceId/doctors/:doctorId', async (c) => {
  try {
    const serviceId = c.req.param('serviceId');
    const doctorId = c.req.param('doctorId');
    const body = await c.req.json();
    const now = new Date().toISOString();

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM service_doctors WHERE id = ? AND serviceId = ?'
    ).bind(doctorId, serviceId).all();

    if (results.length === 0) {
      return c.json({ success: false, error: 'Mapping not found' }, 404);
    }

    const current = results[0] as any;
    const updated = {
      doctorName: body.doctorName !== undefined ? body.doctorName : current.doctorName,
      country: body.country !== undefined ? body.country : current.country,
      displayOrder: body.displayOrder !== undefined ? body.displayOrder : current.displayOrder,
      isActive: body.isActive !== undefined ? (body.isActive ? 1 : 0) : current.isActive,
    };

    await c.env.DB.prepare(`
      UPDATE service_doctors SET
        doctorName = ?, country = ?, displayOrder = ?, isActive = ?, updatedAt = ?
      WHERE id = ?
    `).bind(
      updated.doctorName,
      updated.country,
      updated.displayOrder,
      updated.isActive,
      now,
      doctorId
    ).run();

    return c.json({ success: true, data: { id: doctorId, ...updated, updatedAt: now } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Remove doctor from service
app.delete('/api/services/:serviceId/doctors/:doctorId', async (c) => {
  try {
    const serviceId = c.req.param('serviceId');
    const doctorId = c.req.param('doctorId');

    // Get info before delete for Sync
    const { results: doctorRecord } = await c.env.DB.prepare(
      'SELECT doctorName FROM service_doctors WHERE id = ?'
    ).bind(doctorId).all();

    await c.env.DB.prepare(
      'DELETE FROM service_doctors WHERE id = ? AND serviceId = ?'
    ).bind(doctorId, serviceId).run();

    // Sync to User (serviceInterests)
    if (doctorRecord.length > 0) {
      const doctorName = (doctorRecord[0] as any).doctorName;
      // Find user (Case insensitive)
      const { results: users } = await c.env.DB.prepare(
        'SELECT * FROM users WHERE LOWER(name) = LOWER(?)'
      ).bind(doctorName).all();

      if (users.length > 0) {
        const user = users[0] as any;
        let interests = user.serviceInterests ? JSON.parse(user.serviceInterests) : [];
        const sid = parseInt(serviceId);
        if (interests.includes(sid)) {
          interests = interests.filter((id: number) => id !== sid);
          await c.env.DB.prepare(
            'UPDATE users SET serviceInterests = ? WHERE id = ?'
          ).bind(JSON.stringify(interests), user.id).run();
        }
      }
    }

    return c.json({ success: true, message: 'Doctor removed from service' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get services for a specific doctor
app.get('/api/doctors/:doctorName/services', async (c) => {
  try {
    const doctorName = decodeURIComponent(c.req.param('doctorName'));
    const { results } = await c.env.DB.prepare(`
      SELECT s.*, sd.displayOrder as doctorDisplayOrder 
      FROM services s
      JOIN service_doctors sd ON s.id = sd.serviceId
      WHERE sd.doctorName = ? AND sd.isActive = 1
      ORDER BY s.displayOrder ASC
    `).bind(doctorName).all();

    const services = results.map((row: any) => ({
      ...row,
      isManualSelection: Boolean(row.isManualSelection),
      isActive: Boolean(row.isActive)
    }));

    return c.json({ success: true, data: services });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
