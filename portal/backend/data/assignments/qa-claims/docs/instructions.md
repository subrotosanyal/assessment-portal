# QA Engineer Assignment - Claims Intake Portal

## Problem
You will test a small claims intake portal UI that we provide in the grader. Your job is to write a test plan, create a concise defect log, capture exploratory QA notes, and write Playwright tests that validate the behavior of the portal.

## Provided UI (by grader)
The UI is started by the grader on http://localhost:8090. It has these behaviors:
- Form fields: Claim ID (exactly 6 digits), Email, Incident Date (not in the future), Incident Type (select), Description (min 20 chars), Evidence upload (.pdf only).
- Button: "Run Checks".
- Validation messages:
  - "Claim ID is required"; "Claim ID must be 6 digits".
  - "Email is required"; "Enter a valid email".
  - "Incident date cannot be in the future".
  - "Description must be at least 20 characters".
  - "Evidence is required"; "Evidence must be a PDF".
- On valid submission: it shows a Summary section with a generated Claim Token (e.g., `CLAIM-123456`) and echoes the form values. Errors are cleared when you fix inputs.

## What to submit
A ZIP with:
```
testplan.md                     # test strategy and prioritization
bug-report.md                   # defects you find; include severity + repro steps
exploratory-notes.md            # charter(s), environment, and observations

tests/
  claims.spec.ts
  sample-data/
    evidence.pdf
```
Notes:
- Your tests must navigate to http://localhost:8090/.
- Use Playwright test runner.
- For `bug-report.md`, list each defect with: id, area, severity, steps, expected vs actual.
- For `exploratory-notes.md`, capture at least one charter, the data you used, and the observations/risks you would follow up on.
- You can add more test files or sample data if needed.

## How grading works
The grader will:
1. Build and run a reference UI on port 8090.
2. Install Playwright in the grader image.
3. Execute your tests.
4. The playwright config looks like:
  ```
  import { defineConfig } from '@playwright/test';
  export default defineConfig({
    reporter: [['json', { outputFile: '/workspace/output/playwright.json' }]],
    testDir: './tests',
    timeout: 30000,
    use: {
      baseURL: process.env.BASE_URL || 'http://localhost:8090',
      screenshot: 'on',
      video: 'off',
      trace: 'off',
    },
});
```
5. Look for `testplan.md`, `bug-report.md`, and `exploratory-notes.md` at the zip root.
6. Count passing tests and compute a score. Coverage is collected automatically via the injected fixture.

## Scoring
- Test plan present: 20 points.
- Bug report present: 10 points.
- Exploratory notes present: 10 points.
- Playwright tests: weighted to 60 points total (distributed across the number of tests you have).
- Coverage artifacts generated: 10 points.
- Total score capped at 100.
