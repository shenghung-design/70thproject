# Security Specification & Test-Driven Development (TDD)
## 勝宏集團 70週年專案排程系統 (Zero-Trust Security Blueprint)

This document establishes the security specifications, data invariants, and negative test payloads ("Dirty Dozen") designed to challenge and verify our `firestore.rules`.

---

## 1. Data Invariants

1. **Project Existence**: A Hotspot, ScheduleItem, or Project Option cannot exist or be created without referencing a valid, existing `projectId`.
2. **Key Minimization (Anti-Shadow Fields)**: Document writes must strictly match defined schema fields; injection of arbitrary "ghost" keys (e.g., `role: 'admin'`) must be rejected.
3. **Hotspot Coordinate Safety**: Hotspot coordinates `x` and `y` must be strictly numeric, between `0` and `100` inclusive.
4. **ID Format Validation**: Document and reference IDs must match alphanumeric patterns (`^[a-zA-Z0-9_\-]+$`) and must not exceed `128` characters to prevent Resource Poisoning / Injection.
5. **Temporal Integrity**: All client-supplied dates must follow strict validation or correspond to proper strings, and timestamps must use `request.time` (not arbitrary client times).
6. **Anonymous and Shared Co-editing Access**: Since the user explicitly requested "anyone with the link can co-edit" without a heavy login gate, any authenticated session (including anonymous auth) has access to read and write. However, they are bounded by strict schema shapes to prevent Denial of Wallet and structural pollution.

---

## 2. The "Dirty Dozen" Payloads (Exploit Vector Vectors)

Here are 12 specific malicious payloads designed to breach structural integrity:

### Exploit Vector 1: Shadow Update (Ghost Field Injection)
*   **Payload 1**: Injecting `isAdmin: true` into a project document to escalate privileges.
*   **Payload 2**: Injecting `isVerified: true` or `role: 'superuser'` into the anonymous user account document.

### Exploit Vector 2: Coordinate Out-of-Bounds (Resource Poisoning)
*   **Payload 3**: Setting Hotspot `x` coordinate to `150` or `-50`.
*   **Payload 4**: Setting Hotspot `y` coordinate to a giant string (`"A" * 50000`) to inflate database size.

### Exploit Vector 3: Orphaned Child Document (Broken Reference)
*   **Payload 5**: Creating a ScheduleItem referencing a non-existent `projectId` (e.g., `bogus_project_id_123`).
*   **Payload 6**: Creating a Hotspot referencing a non-existent `projectId`.

### Exploit Vector 4: ID Injection (Junk Characters)
*   **Payload 7**: Injecting a 2KB junk character string containing script tags as a `hotspotId`.

### Exploit Vector 5: Type Pollution
*   **Payload 8**: Submitting `isCompleted` as `"yes"` (string) instead of `true/false` (boolean).
*   **Payload 9**: Submitting `x` and `y` coordinates as strings (`"50%"`) instead of floats/integers.

### Exploit Vector 6: Invalid Temporal Sequences
*   **Payload 10**: Submitting a blank or excessively long string for `proofDeadline` (e.g., `5000` characters of trash) to crash calendar calculations.

### Exploit Vector 7: Option Library Hijack
*   **Payload 11**: Emptying the standard departments option array or injecting script-injected departments like `<script>alert('hack')</script>`.

### Exploit Vector 8: Contact Card Overload
*   **Payload 12**: Submitting a contact card where the `mobile` phone field is a `1MB` string to trigger client-side render crash or inflate cloud egress.

---

## 3. Test Runner Design (`firestore.rules.test.ts`)

A mock test suite verifying the rules reject the Dirty Dozen:

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Sheng Hong Scheduler Security Rules Audit', () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'shenghong-70th-scheduler',
      firestore: {
        rules: require('fs').readFileSync('firestore.rules', 'utf8')
      }
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it('rejects Shadow Updates with ghost fields', async () => {
    const db = testEnv.authenticatedContext('user_123').firestore();
    const docRef = db.doc('projects/project_70th_box');
    await assertFails(docRef.set({
      id: 'project_70th_box',
      name: '70th Box',
      imageSrc: 'http://...',
      isAdmin: true // MALICIOUS KEY
    }));
  });

  it('rejects coordinate out of bounds (Payload 3 & 4)', async () => {
    const db = testEnv.authenticatedContext('user_123').firestore();
    const docRef = db.doc('projects/project_70th_box/hotspots/hotspot_malicious');
    await assertFails(docRef.set({
      id: 'hotspot_malicious',
      projectId: 'project_70th_box',
      code: 'X1',
      name: 'Malicious Spot',
      x: 120, // OUT OF BOUNDS
      y: 50
    }));
  });

  it('rejects invalid boolean types (Payload 8)', async () => {
    const db = testEnv.authenticatedContext('user_123').firestore();
    const docRef = db.doc('projects/project_70th_box/items/item_malicious');
    await assertFails(docRef.set({
      id: 'item_malicious',
      projectId: 'project_70th_box',
      hotspotId: null,
      code: '',
      name: 'Unchecked item',
      department: '企劃部',
      owner: '林小明',
      vendor: '美好印刷',
      contactId: null,
      proofDeadline: '2026-07-15',
      completionDate: '2026-07-25',
      isCompleted: "yes" // POLLUTED TYPE
    }));
  });
});
```
